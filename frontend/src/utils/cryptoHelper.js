const arrayBufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

const base64ToUint8Array = (base64String) => {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export const encryptFileOnClient = async (file) => {
  const cryptoKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileArrayBuffer = await file.arrayBuffer();
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv }, cryptoKey, fileArrayBuffer
  );

  const exportedKey = await window.crypto.subtle.exportKey("raw", cryptoKey);
  
  return {
    encryptedBlob: new Blob([encryptedBuffer], { type: 'application/octet-stream' }),
    keyBase64: arrayBufferToBase64(exportedKey),
    ivBase64: arrayBufferToBase64(iv.buffer)
  };
};

export const decryptFileOnClient = async (encryptedBuffer, keyBase64, ivBase64) => {
  const keyBytes = base64ToUint8Array(keyBase64);
  const ivBytes = base64ToUint8Array(ivBase64);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes }, cryptoKey, encryptedBuffer
  );

  return decryptedBuffer;
};