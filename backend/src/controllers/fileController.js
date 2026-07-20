const File = require('../models/File');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const geoip = require('geoip-lite');
const axios = require('axios');

// 1. Upload Stream (Zero-Knowledge, data is already encrypted by the browser)
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const policies = req.body.permissions ? JSON.parse(req.body.permissions) : [];
    const allowedCountries = req.body.countries ? req.body.countries.split(',').map(c => c.trim().toUpperCase()).filter(c => c) : [];
    const isBurnAfterReading = req.body.isBurnAfterReading === 'true';
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const cloudStream = cloudinary.uploader.upload_stream(
          { resource_type: 'raw', folder: 'vaultshare_files' }, 
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        // 🚀 Streams from the hard drive, NOT the RAM
        fs.createReadStream(req.file.path).pipe(cloudStream);
      });
    };

    const result = await streamUpload();
    
    // 🧹 Clean up temporary server storage to save disk space
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    const newFile = await File.create({
      owner: req.user.id,
      originalName: req.body.fileName || 'encrypted_payload',
      cloudinaryUrl: result.secure_url,
      cloudinaryId: result.public_id,
      mimeType: req.body.fileType || 'application/octet-stream',
      size: req.file.size,
      allowedUsers: policies,
      allowedCountries,
      isBurnAfterReading,
      expiresAt
    });

    res.status(200).json({ fileId: newFile._id, originalName: newFile.originalName });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error(error);
    res.status(500).json({ error: "Transmission protocol failed." });
  }
};

// 2. Access Gatekeeper (Serves the binary stream without decrypting)
exports.downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: "Data payload destroyed or missing." });

    // Enforce Geo-Fencing
    if (file.allowedCountries && file.allowedCountries.length > 0) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const geo = geoip.lookup(ip);
      if (geo && !file.allowedCountries.includes(geo.country)) {
        return res.status(403).json({ error: `GEO-BLOCKED: Access denied from territory ${geo.country}.` });
      }
    }

    // Enforce Time-Bomb
    if (file.expiresAt && new Date() > file.expiresAt) {
      return res.status(403).json({ error: "ACCESS DENIED: Token time-bomb has expired." });
    }

    // Enforce Burn-After-Reading
    if (file.isBurnAfterReading && file.isBurned) {
      return res.status(403).json({ error: "ACCESS DENIED: Payload has been incinerated." });
    }

    // Enforce ACL
    const currentUser = await User.findById(req.user.id);
    const isOwner = file.owner.toString() === req.user.id;
    const aclEntry = file.allowedUsers.find(u => u.email === currentUser.email);

    if (!isOwner && !aclEntry) {
      return res.status(403).json({ error: "ACCESS DENIED: Unrecognized cryptographic identity." });
    }

    if (file.isBurnAfterReading && !isOwner) {
      file.isBurned = true;
      await file.save();
    }

   // ... [Inside your downloadFile function] ...

    // 🚀 Stream the raw encrypted file directly to the client browser
    const cloudResponse = await axios({ method: 'get', url: file.cloudinaryUrl, responseType: 'stream' });
    
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // 🚀 RESTORED: Strict Zero-Trust Anti-Caching Headers (These were missing from your paste!)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    cloudResponse.data.pipe(res);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Download protocol failed." });
  }
};

// 3. Vault & Gallery Data
exports.getMyFiles = async (req, res) => {
  try {
    const files = await File.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(files);
  } catch (error) { res.status(500).json({ error: "Failed to access Vault." }); }
};

// 4. Nuclear Revocation (Destroy File)
exports.revokeAccess = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id });
    if (!file) return res.status(404).json({ error: "File not found." });
    await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: 'raw' });
    await File.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Payload destroyed." });
  } catch (error) { res.status(500).json({ error: "Revocation failed." }); }
};

// 5. Targeted Revocation (Remove specific user)
exports.removeUserAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { emailToRemove } = req.body;
    const file = await File.findOne({ _id: id, owner: req.user.id });
    if (!file) return res.status(404).json({ error: "File not found." });
    file.allowedUsers = file.allowedUsers.filter(user => user.email !== emailToRemove);
    await File.updateOne({ _id: id }, { $set: { allowedUsers: file.allowedUsers } });
    res.status(200).json({ message: "Access revoked." });
  } catch (error) { res.status(500).json({ error: "Failed to update ACL." }); }
};

// 6. Targeted Grant (Add specific user)
exports.addUserAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { newEmail, accessLevel = 'read' } = req.body;
    const file = await File.findOne({ _id: id, owner: req.user.id });
    if (!file) return res.status(404).json({ error: "File not found." });
    const exists = file.allowedUsers.some(u => u.email === newEmail);
    if (exists) return res.status(400).json({ error: "User already has clearance." });
    file.allowedUsers.push({ email: newEmail, accessLevel });
    await File.updateOne({ _id: id }, { $set: { allowedUsers: file.allowedUsers } });
    res.status(200).json({ message: "Clearance granted." });
  } catch (error) { res.status(500).json({ error: "Failed to expand ACL." }); }
};