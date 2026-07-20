import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import SecureViewer from '../components/SecureViewer';
import WatermarkOverlay from '../components/WatermarkOverlay'; // 🚀 NEW
import { encryptFileOnClient, decryptFileOnClient } from '../utils/cryptoHelper';

const Dashboard = () => {
  const { user, setUser } = useAuth();
  
  // --- UI State ---
  const [isUploading, setIsUploading] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [vaultFiles, setVaultFiles] = useState([]);

  // --- Transmission Security State ---
  const [policies, setPolicies] = useState([{ email: '', accessLevel: 'read' }]);
  const [isBurnAfterReading, setIsBurnAfterReading] = useState(false);
  const [expiryHours, setExpiryHours] = useState(0); 
  const [allowedCountries, setAllowedCountries] = useState('');

  // --- Inline Add User State ---
  const [addingUserToFileId, setAddingUserToFileId] = useState(null);
  const [newGrantEmail, setNewGrantEmail] = useState('');
  const [newGrantLevel, setNewGrantLevel] = useState('read');

  // --- SECURE DATA ROOM STATE ---
  const [securePayloadUrl, setSecurePayloadUrl] = useState(null);
  const [securePayloadType, setSecurePayloadType] = useState(null);
  const [securePayloadName, setSecurePayloadName] = useState('');

  useEffect(() => {
    fetchVaultFiles();
  }, []);

  const fetchVaultFiles = async () => {
    try {
      const res = await api.get('/files/vault');
      setVaultFiles(res.data);
    } catch (err) {
      console.error("Failed to load vault:", err);
    }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } finally { setUser(null); }
  };

  const updatePolicy = (index, field, value) => {
    const newPolicies = [...policies];
    newPolicies[index][field] = value;
    setPolicies(newPolicies);
  };
  const addPolicy = () => setPolicies([...policies, { email: '', accessLevel: 'read' }]);
  const removePolicy = (index) => setPolicies(policies.filter((_, i) => i !== index));

  const handleRevoke = async (fileId) => {
    if (!window.confirm("WARNING: This will permanently destroy the payload. Proceed?")) return;
    try {
      await api.delete(`/files/revoke/${fileId}`);
      setSuccessMsg("Target payload permanently destroyed.");
      fetchVaultFiles(); 
    } catch (err) {
      setError("Failed to revoke access.");
    }
  };

  const handleRemoveUserAccess = async (fileId, emailToRemove) => {
    if (!window.confirm(`Revoke cryptographic clearance for ${emailToRemove}?`)) return;
    try {
      await api.put(`/files/revoke-user/${fileId}`, { emailToRemove });
      setSuccessMsg(`Clearance revoked for ${emailToRemove}.`);
      fetchVaultFiles(); 
    } catch (err) {
      setError(err.response?.data?.error || "Failed to modify ACL.");
    }
  };

  const handleAddUserAccess = async (fileId) => {
    if (!newGrantEmail.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      await api.put(`/files/grant-user/${fileId}`, { newEmail: newGrantEmail, accessLevel: newGrantLevel });
      setSuccessMsg(`Clearance granted to ${newGrantEmail}.`);
      setAddingUserToFileId(null);
      setNewGrantEmail('');
      setNewGrantLevel('read');
      fetchVaultFiles(); 
    } catch (err) {
      setError(err.response?.data?.error || "Failed to grant access.");
    }
  };

  const onTransmitterDrop = useCallback(async (acceptedFiles) => {
    setError(''); setSuccessMsg('');
    const file = acceptedFiles[0];
    if (!file) return;

    // Fail-Fast 10MB Limit Validation for Cloudinary
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return setError("File exceeds the 10MB security limit. Please select a smaller payload.");
    }

    setIsUploading(true);
    
    try {
      const { encryptedBlob, keyBase64, ivBase64 } = await encryptFileOnClient(file);

      const formData = new FormData();
      const validPolicies = policies.filter(p => p.email.trim() !== '');
      formData.append('permissions', JSON.stringify(validPolicies));
      formData.append('isBurnAfterReading', isBurnAfterReading);
      if (allowedCountries.trim()) formData.append('countries', allowedCountries);
      if (expiryHours > 0) {
        const expiryDate = new Date(new Date().getTime() + expiryHours * 60 * 60 * 1000);
        formData.append('expiresAt', expiryDate.toISOString());
      }
      
      formData.append('vaultFile', encryptedBlob);
      formData.append('fileName', file.name);
      formData.append('fileType', file.type);

      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const vsfTokenData = {
        fileId: response.data.fileId,
        originalName: file.name,
        fileType: file.type,
        aesKey: keyBase64,
        iv: ivBase64
      };

      const vsfBlob = new Blob([JSON.stringify(vsfTokenData, null, 2)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(vsfBlob);
      const cleanFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cleanFileName}.vsf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMsg(`File securely governed. Local AES-256 .vsf token generated.`);
      setPolicies([{ email: '', accessLevel: 'read' }]);
      setIsBurnAfterReading(false);
      setExpiryHours(0);
      setAllowedCountries('');
      fetchVaultFiles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to securely transmit.');
    } finally {
      setIsUploading(false);
    }
  }, [policies, isBurnAfterReading, expiryHours, allowedCountries]);

  // --- 🚀 UPGRADED: CLIENT-SIDE DECRYPTION PIPELINE ---
  const onReaderDrop = useCallback(async (acceptedFiles) => {
    setError(''); setSuccessMsg('');
    const file = acceptedFiles[0];
    if (!file || !file.name.endsWith('.vsf')) {
      setError('Invalid Cryptographic Token. Must be a .vsf file.');
      return;
    }

    setIsDecrypting(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const vsfData = JSON.parse(e.target.result);
        
        // 🚀 THE FIX: Appending Date.now() forces a brand new network request, completely bypassing the browser cache
        const response = await api.get(`/files/download/${vsfData.fileId}?cb=${Date.now()}`, { 
          responseType: 'arraybuffer' 
        });
        
        const decryptedBuffer = await decryptFileOnClient(
          response.data, 
          vsfData.aesKey, 
          vsfData.iv
        );
        
        const clearBlob = new Blob([decryptedBuffer], { type: vsfData.fileType || 'application/octet-stream' });
        const decryptedUrl = URL.createObjectURL(clearBlob);
        
        setSecurePayloadUrl(decryptedUrl);
        setSecurePayloadType(vsfData.fileType);
        setSecurePayloadName(vsfData.originalName || 'Classified Payload');
        
        fetchVaultFiles(); 
      } catch (err) {
        if (err.response && err.response.data) {
            try {
                const textError = new TextDecoder().decode(err.response.data);
                const jsonError = JSON.parse(textError);
                setError(jsonError.error || 'ACCESS DENIED: Decryption Failed.');
            } catch (e) { 
                setError("ACCESS DENIED: Network or Decryption Failure."); 
            }
        } else {
            setError('ACCESS DENIED: Decryption Failed or Key Invalid.');
        }
      } finally { setIsDecrypting(false); }
    };
    reader.readAsText(file);
  }, []);

  const closeSecureViewer = () => {
    if (securePayloadUrl) {
      URL.revokeObjectURL(securePayloadUrl);
    }
    setSecurePayloadUrl(null);
    setSecurePayloadType(null);
    setSecurePayloadName('');
  };

  const { getRootProps: getTransmitterProps, getInputProps: getTransmitterInputProps, isDragActive: isTransmitterActive } = useDropzone({ onDrop: onTransmitterDrop, multiple: false });
  const { getRootProps: getReaderProps, getInputProps: getReaderInputProps, isDragActive: isReaderActive } = useDropzone({ onDrop: onReaderDrop, multiple: false, accept: { 'application/json': ['.vsf'] } });

  return (
    <div className="bg-[#0c1324] text-[#dce2fa] min-h-screen font-sans circuit-pattern flex flex-col relative pb-12">
      
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center p-1">
            <img src="/fg-logo.png" alt="FileGate Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">FileGate</h1>
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-widest mt-0.5">Secure Data Governance</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-[#141b2c] px-3 py-1.5 rounded-full border border-[#1e293b]">
            <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_5px_#10b981]"></div>
            <span className="text-xs font-medium text-[#cbd5e1]">{user?.email}</span>
          </div>
          <button onClick={handleLogout} className="bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] border border-[#ffb4ab]/30 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-sm">logout</span> Disconnect
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-10">
        {error && <div className="rounded-lg bg-[#93000a]/30 border border-[#ffb4ab]/30 p-4 text-[#ffb4ab] flex items-center gap-2"><span className="material-symbols-outlined">gpp_bad</span> {error}</div>}
        {successMsg && <div className="rounded-lg bg-[#00bd85]/20 border border-[#45dfa4]/30 p-4 text-[#45dfa4] flex items-center gap-2"><span className="material-symbols-outlined">verified_user</span> {successMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
               <span className="material-symbols-outlined text-[#45dfa4]">policy</span> Transmission Security
            </h2>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-xl space-y-6">
              <div className="space-y-3">
                <p className="text-xs text-[#d3c5ac] uppercase tracking-wider font-semibold border-b border-[#1e293b] pb-2">Access Control List</p>
                {policies.map((policy, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2">
                    <input type="email" placeholder="agent@company.com" value={policy.email} onChange={(e) => updatePolicy(index, 'email', e.target.value)} className="flex-1 bg-[#141b2c] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:border-[#45dfa4] focus:outline-none transition-colors"/>
                    <select value={policy.accessLevel} onChange={(e) => updatePolicy(index, 'accessLevel', e.target.value)} className="bg-[#141b2c] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:border-[#45dfa4] focus:outline-none">
                      <option value="read">Read Only</option>
                      <option value="write">Read & Write</option>
                    </select>
                    {policies.length > 1 && (
                      <button onClick={() => removePolicy(index)} className="p-2 bg-[#93000a]/20 text-[#ffb4ab] rounded-lg border border-[#ffb4ab]/30 hover:bg-[#93000a]/40 transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
                    )}
                  </div>
                ))}
                <button onClick={addPolicy} className="text-xs text-[#fbbf24] hover:text-[#d97706] font-semibold tracking-wider uppercase transition-colors flex items-center gap-1 cursor-pointer">
                  <span className="material-symbols-outlined text-sm">add</span> Add Personnel
                </button>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#1e293b]">
                 <p className="text-xs text-[#d3c5ac] uppercase tracking-wider font-semibold">Advanced Governance</p>
                 <label className="flex items-center gap-3 cursor-pointer group">
                   <input type="checkbox" checked={isBurnAfterReading} onChange={(e) => setIsBurnAfterReading(e.target.checked)} className="w-5 h-5 rounded border-[#1e293b] bg-[#141b2c] text-[#fbbf24] focus:ring-[#fbbf24] focus:ring-offset-0 cursor-pointer"/>
                   <div>
                     <p className="text-sm text-white group-hover:text-[#fbbf24] transition-colors font-medium">Burn-After-Reading</p>
                     <p className="text-xs text-[#d3c5ac]/70">Payload self-destructs after one decryption.</p>
                   </div>
                 </label>
                 <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#d3c5ac]">timer</span>
                    <select value={expiryHours} onChange={(e) => setExpiryHours(Number(e.target.value))} className="bg-[#141b2c] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:border-[#45dfa4] focus:outline-none w-full">
                      <option value={0}>No Expiry (Persistent)</option>
                      <option value={1}>Self-Destruct in 1 Hour</option>
                      <option value={24}>Self-Destruct in 24 Hours</option>
                      <option value={168}>Self-Destruct in 7 Days</option>
                    </select>
                 </div>
                 <div className="flex items-center gap-3 pt-2">
                    <span className="material-symbols-outlined text-[#d3c5ac]">public_off</span>
                    <input type="text" placeholder="Allowed Country Codes (e.g., IN, US, UK)" value={allowedCountries} onChange={(e) => setAllowedCountries(e.target.value)} className="bg-[#141b2c] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:border-[#45dfa4] focus:outline-none w-full"/>
                 </div>
              </div>
            </div>
            
            <div {...getTransmitterProps()} className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isTransmitterActive ? 'border-[#45dfa4] bg-[#141b2c]' : 'border-[#334155] bg-[#141b2c]/60 hover:border-[#45dfa4] group'} ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <input {...getTransmitterInputProps()} />
              <div className={`w-16 h-16 rounded-full bg-[#0f172a] border border-[#1e293b] flex items-center justify-center mb-4 shadow-lg transition-transform ${isTransmitterActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                <span className={`material-symbols-outlined text-3xl ${isUploading ? 'text-[#fbbf24] animate-spin' : 'text-[#45dfa4]'}`}>{isUploading ? 'autorenew' : 'cloud_upload'}</span>
              </div>
              <h3 className="font-semibold text-white text-base">{isUploading ? 'Encrypting Locally & Transmitting...' : 'Secure File Transmitter'}</h3>
              <p className="text-xs text-[#d3c5ac] mt-1 max-w-xs">{isTransmitterActive ? <span className="text-[#45dfa4]">Drop file to execute...</span> : <>Drag & drop a file here to generate a <code className="text-[#fbbf24]">.vsf</code> token with above policies.</>}</p>
            </div>
          </div>

          <div className="space-y-4">
             <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
               <span className="material-symbols-outlined text-[#fbbf24]">dns</span> Vault Access
            </h2>
            <div {...getReaderProps()} className={`h-[calc(100%-40px)] border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isReaderActive ? 'border-[#fbbf24] bg-[#141b2c]' : 'border-[#1e293b] bg-[#0f172a] hover:border-[#fbbf24] group'} ${isDecrypting ? 'opacity-50 pointer-events-none' : ''}`}>
              <input {...getReaderInputProps()} />
              <div className={`w-16 h-16 rounded-full bg-[#141b2c] border border-[#1e293b] flex items-center justify-center mb-4 shadow-lg transition-transform ${isReaderActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                <span className={`material-symbols-outlined text-3xl ${isDecrypting ? 'text-[#45dfa4] animate-pulse' : 'text-[#fbbf24]'}`}>{isDecrypting ? 'memory' : 'enhanced_encryption'}</span>
              </div>
              <h3 className="font-semibold text-white text-base">{isDecrypting ? 'Authenticating & Decrypting Locally...' : 'Cryptographic Reader'}</h3>
              <p className="text-xs text-[#d3c5ac] mt-2 max-w-xs leading-relaxed">
                {isReaderActive ? <span className="text-[#fbbf24]">Initiate Decryption...</span> : <>Received a secure file? Drop the <code className="text-[#fbbf24]">.vsf</code> token here.</>}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-10 mt-10 border-t border-[#1e293b]">
           <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 mb-6">
             <span className="material-symbols-outlined text-[#45dfa4]">inventory_2</span> Active Vault Manifest
           </h2>
           
           {vaultFiles.length === 0 ? (
             <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-10 text-center">
               <span className="material-symbols-outlined text-4xl text-[#334155] mb-2">folder_off</span>
               <p className="text-[#d3c5ac]">Your vault is currently empty.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {vaultFiles.map(file => (
                 <div key={file._id} className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col relative overflow-hidden group">
                   
                   <div className="absolute top-0 left-0 w-1 h-full bg-[#45dfa4]"></div>
                   {(file.isBurnAfterReading || file.expiresAt || file.allowedCountries?.length > 0) && (
                      <div className="absolute top-3 right-3 flex gap-1">
                        {file.isBurnAfterReading && <span title="Burn After Reading" className="material-symbols-outlined text-sm text-[#fbbf24]">local_fire_department</span>}
                        {file.expiresAt && <span title="Time Bomb Active" className="material-symbols-outlined text-sm text-[#fbbf24]">timer</span>}
                        {file.allowedCountries?.length > 0 && <span title="Geo-Restricted" className="material-symbols-outlined text-sm text-[#fbbf24]">public_off</span>}
                      </div>
                   )}

                   <div className="flex items-start gap-3 mb-4 pl-2">
                     <span className="material-symbols-outlined text-3xl text-[#d3c5ac]">description</span>
                     <div className="truncate w-full pr-8">
                       <p className="font-semibold text-white truncate" title={file.originalName}>{file.originalName}</p>
                       <p className="text-[10px] font-mono text-[#d3c5ac]/70 mt-1">{(file.size / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleDateString()}</p>
                     </div>
                   </div>

                   <div className="mb-4 pl-2">
                     <p className="text-[9px] text-[#d3c5ac] uppercase tracking-wider mb-2 font-semibold">Authorized Personnel:</p>
                     
                     <div className="flex flex-wrap gap-2 mb-2">
                       {file.allowedUsers && file.allowedUsers.map(u => (
                         <span key={u.email} className="inline-flex items-center gap-1 bg-[#141b2c] border border-[#1e293b] pl-2 pr-1 py-1 rounded text-[10px] text-white">
                           <span className="truncate max-w-[120px]" title={u.email}>{u.email}</span>
                           <button onClick={() => handleRemoveUserAccess(file._id, u.email)} className="text-[#ffb4ab] hover:bg-[#93000a]/40 hover:text-white rounded p-0.5 transition-colors flex items-center justify-center cursor-pointer" title="Revoke User Access">
                             <span className="material-symbols-outlined text-[14px]">close</span>
                           </button>
                         </span>
                       ))}
                     </div>

                     {addingUserToFileId === file._id ? (
                       <div className="flex flex-col gap-2 mt-2 bg-[#141b2c] p-2 rounded-lg border border-[#1e293b]">
                         <input type="email" placeholder="agent@company.com" value={newGrantEmail} onChange={(e) => setNewGrantEmail(e.target.value)} className="bg-[#0f172a] border border-[#334155] rounded px-2 py-1.5 text-xs text-white focus:border-[#45dfa4] focus:outline-none w-full" autoFocus />
                         <div className="flex gap-2">
                           <select value={newGrantLevel} onChange={(e) => setNewGrantLevel(e.target.value)} className="bg-[#0f172a] border border-[#334155] rounded px-2 py-1 text-xs text-white focus:outline-none flex-1">
                             <option value="read">Read Only</option>
                             <option value="write">Read & Write</option>
                           </select>
                           <button onClick={() => handleAddUserAccess(file._id)} className="bg-[#45dfa4]/20 hover:bg-[#45dfa4]/40 border border-[#45dfa4]/50 text-[#45dfa4] px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer">Add</button>
                           <button onClick={() => setAddingUserToFileId(null)} className="text-[#d3c5ac] hover:text-white px-2 py-1 text-xs transition-colors cursor-pointer">Cancel</button>
                         </div>
                       </div>
                     ) : (
                       <button onClick={() => setAddingUserToFileId(file._id)} className="text-[10px] text-[#fbbf24] hover:text-[#d97706] uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer mt-1">
                         <span className="material-symbols-outlined text-[12px]">person_add</span> Grant Access
                       </button>
                     )}
                   </div>

                   <div className="mt-auto pl-2 border-t border-[#1e293b] pt-3 flex justify-between items-center">
                     <p className="text-[10px] font-mono text-[#45dfa4] bg-[#141b2c] px-2 py-1 rounded border border-[#1e293b]">GCM-256 (E2EE)</p>
                     
                     <button onClick={() => handleRevoke(file._id)} className="text-xs font-semibold text-[#ffb4ab] bg-[#93000a]/20 hover:bg-[#93000a]/60 border border-[#ffb4ab]/30 px-3 py-1.5 rounded transition-colors flex items-center gap-1 cursor-pointer opacity-0 group-hover:opacity-100">
                       <span className="material-symbols-outlined text-[14px]">delete_forever</span> Destroy
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </main>

     {/* SECURE DATA ROOM OVERLAY */}
      {securePayloadUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
          
          <div className="w-full max-w-5xl flex justify-between items-center mb-4">
            <div className="flex items-center gap-3 text-white">
              <span className="material-symbols-outlined text-[#45dfa4] text-3xl">enhanced_encryption</span>
              <div>
                <h3 className="font-bold text-lg">{securePayloadName}</h3>
                <p className="text-[10px] text-[#45dfa4] font-mono tracking-widest uppercase">End-to-End Encrypted Sandbox</p>
              </div>
            </div>
            <button 
              onClick={closeSecureViewer} 
              className="bg-[#93000a] hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(147,0,10,0.5)] cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span> Terminate Connection
            </button>
          </div>

          {/* Secure Render Area */}
          <div 
            className="w-full max-w-5xl flex-1 bg-[#0f172a] rounded-xl border border-[#1e293b] shadow-2xl overflow-hidden relative flex items-center justify-center"
            onContextMenu={(e) => e.preventDefault()} 
          >
            {/* The invisible shield to stop standard selection */}
            <div className="absolute inset-0 z-10 select-none pointer-events-none" style={{ pointerEvents: securePayloadType === 'application/pdf' ? 'none' : 'auto' }}></div>
            
            {/* 🚀 NEW: THE FORENSIC WATERMARK */}
            <WatermarkOverlay user={user} />

            {/* The Universal Offline Engine */}
            <SecureViewer 
               url={securePayloadUrl} 
               fileType={securePayloadType} 
               fileName={securePayloadName} 
            />
            
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;