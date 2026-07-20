import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// The True VDR Offline PDF Engine
import { Document, Page, pdfjs } from 'react-pdf';

// Official Vite Offline Worker Import
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const SecureViewer = ({ url, fileType, fileName }) => {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    const parseFile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        // ROUTE 1: Microsoft Word (.docx)
        if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setContent(<div className="bg-white text-black p-8 rounded-lg overflow-y-auto w-full h-full" dangerouslySetInnerHTML={{ __html: result.value }} />);
        } 
        
        // ROUTE 2: Spreadsheets (.xlsx, .csv)
        else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileType === 'text/csv') {
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const htmlString = XLSX.utils.sheet_to_html(workbook.Sheets[firstSheetName]);
          setContent(
            <div className="bg-white text-black p-4 rounded-lg overflow-y-auto w-full h-full excel-viewer">
              <style>{`table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }`}</style>
              <div dangerouslySetInnerHTML={{ __html: htmlString }} />
            </div>
          );
        }

        // ROUTE 3: Plain Text and Code Files
        else if (fileType.startsWith('text/') || fileType === 'application/json' || fileName.endsWith('.js') || fileName.endsWith('.py')) {
          const text = new TextDecoder().decode(arrayBuffer);
          let language = 'text';
          if (fileName.endsWith('.js')) language = 'javascript';
          if (fileName.endsWith('.py')) language = 'python';
          if (fileName.endsWith('.json') || fileType === 'application/json') language = 'json';
          if (fileName.endsWith('.html')) language = 'html';

          setContent(
            <div className="w-full h-full overflow-y-auto rounded-lg bg-[#1e1e1e] text-left p-4">
              <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, padding: 0, background: 'transparent' }}>
                {text}
              </SyntaxHighlighter>
            </div>
          );
        }
        
        // Let Native HTML5 handle Media
        else {
           setContent('NATIVE_RENDER');
        }

      } catch (err) {
        setError('Failed to parse secure payload.');
      } finally {
        setIsLoading(false);
      }
    };

    parseFile();
  }, [url, fileType, fileName]);

  if (isLoading) {
    return <div className="text-[#45dfa4] flex flex-col items-center"><span className="material-symbols-outlined text-4xl animate-spin mb-4">autorenew</span><p>Decrypting and Parsing Payload...</p></div>;
  }

  if (error) {
    return <div className="text-[#ef4444] text-center"><span className="material-symbols-outlined text-5xl mb-4">error</span><p>{error}</p></div>;
  }

  // If it's a format we parsed manually (Word, Excel, Text)
  if (content !== 'NATIVE_RENDER') {
     return <div className="w-full h-full p-4">{content}</div>;
  }

  // --- 🚀 NEW: LOCKED DOWN NATIVE MEDIA BLOCK ---
  
  // 1. IMAGES (.jpg, .png, .gif)
  if (fileType?.startsWith('image/')) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <img 
          src={url} 
          alt="Secure Payload" 
          className="max-w-full max-h-full object-contain pointer-events-none select-none shadow-2xl" 
          draggable="false"
        />
      </div>
    );
  }
  
  // 2. VIDEOS (.mp4, .webm)
  if (fileType?.startsWith('video/')) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <video 
          src={url} 
          controls 
          controlsList="nodownload" 
          disablePictureInPicture
          className="max-w-full max-h-full shadow-2xl"
        ></video>
      </div>
    );
  }

  // 3. AUDIO (.mp3, .wav)
  if (fileType?.startsWith('audio/')) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f172a] p-10">
        <div className="w-24 h-24 rounded-full bg-[#141b2c] border border-[#1e293b] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(69,223,164,0.1)]">
           <span className="material-symbols-outlined text-5xl text-[#45dfa4]">graphic_eq</span>
        </div>
        <h3 className="text-white font-bold mb-2">{fileName}</h3>
        <p className="text-[10px] text-[#45dfa4] font-mono tracking-widest uppercase mb-8">Encrypted Audio Stream</p>
        
        <audio 
          src={url} 
          controls 
          controlsList="nodownload" 
          className="w-full max-w-md"
        ></audio>
      </div>
    );
  }

  // --- PURE JAVASCRIPT CANVAS RENDERING (PDFs) ---
  if (fileType === 'application/pdf') {
    return (
      <div className="w-full h-full overflow-y-auto bg-[#0f172a] flex flex-col items-center py-8">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="text-[#45dfa4] mt-10 flex flex-col items-center"><span className="material-symbols-outlined animate-spin text-4xl mb-2">autorenew</span>Processing Secure PDF...</div>}
          error={<div className="text-[#ef4444] mt-10 font-bold">Failed to decrypt PDF stream.</div>}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <Page 
              key={`page_${index + 1}`} 
              pageNumber={index + 1} 
              className="mb-8 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
              renderTextLayer={false} 
              renderAnnotationLayer={false}
              width={800}
            />
          ))}
        </Document>
      </div>
    );
  }

  // --- UNSUPPORTED FALLBACK ---
  return (
    <div className="text-center p-10 text-white flex flex-col items-center justify-center h-full mt-20">
      <span className="material-symbols-outlined text-5xl text-[#ef4444] mb-4">gpp_bad</span>
      <p className="text-lg font-bold mb-2 text-[#ef4444]">Format Not Supported by Secure Sandbox</p>
      <p className="text-sm text-[#94a3b8] mb-6 max-w-md text-center">
        Strict Zero-Trust protocols prevent downloading this payload. Web browsers cannot natively render Microsoft PowerPoint files without exposing data to third-party services.
      </p>
    </div>
  );
};

export default SecureViewer;