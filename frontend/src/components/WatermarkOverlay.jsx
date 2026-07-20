import React, { useEffect, useState, useRef } from 'react';

const WatermarkOverlay = ({ user }) => {
  const [bgUrl, setBgUrl] = useState('');
  const [ipAddress, setIpAddress] = useState('Fetching IP...');
  
  // Forensic Tracking Identifiers
  const sessionId = useRef(crypto.randomUUID().split('-')[0].toUpperCase()); // Short UUID
  const sessionStartTime = useRef(new Date().toLocaleString());

  // Hardware/Software Fingerprinting
  const getOS = () => {
    const ua = navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "Windows";
    if (ua.indexOf("Mac") !== -1) return "MacOS";
    if (ua.indexOf("X11") !== -1 || ua.indexOf("Linux") !== -1) return "Linux";
    if (ua.indexOf("Android") !== -1) return "Android";
    if (ua.indexOf("like Mac") !== -1) return "iOS";
    return "Unknown OS";
  };

  const getBrowser = () => {
    const ua = navigator.userAgent;
    if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Edg")) return "Edge";
    return "Unknown Browser";
  };

  useEffect(() => {
    // Attempt to fetch IP (Fails safely if offline or blocked)
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('Hidden/Encrypted Route'));
  }, []);

  useEffect(() => {
    // Wait for IP to resolve before drawing the watermark
    if (ipAddress === 'Fetching IP...') return;

    const canvas = document.createElement('canvas');
    // Canvas size determines the spacing/grid of the repeating pattern
    canvas.width = 500;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set standard anchor point to the center of the canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    // Rotate exactly -35 degrees
    ctx.rotate(-35 * Math.PI / 180);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Build the VDR Payload
    const lines = [
      "CONFIDENTIAL",
      user?.email || "Authenticated User",
      sessionStartTime.current,
      `${getBrowser()} • ${getOS()}`,
      `IP: ${ipAddress}`,
      `Session ID: ${sessionId.current}`,
      "Shared via FileGate"
    ];

    // Render text lines iteratively
    const lineHeight = 24;
    const startY = -((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      // Emphasize the "CONFIDENTIAL" tag
      if (index === 0) {
        ctx.font = '900 20px Arial';
        ctx.fillStyle = 'rgba(128, 128, 128, 0.12)'; // ~12% Opacity
      } else {
        ctx.font = '600 14px Arial';
        ctx.fillStyle = 'rgba(128, 128, 128, 0.08)'; // ~8% Opacity
      }
      ctx.fillText(line, 0, startY + (index * lineHeight));
    });

    // Export to base64 and set as background
    setBgUrl(canvas.toDataURL('image/png'));
  }, [user, ipAddress]);

  return (
    <div 
      className="absolute inset-0 z-50 pointer-events-none select-none"
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center center',
      }}
    />
  );
};

export default WatermarkOverlay;