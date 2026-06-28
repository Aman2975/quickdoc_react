import React, { useState, useRef } from 'react';
import './App.css';

// --- Custom Premium SVG Icons ---
const IconDocument = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
);

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);

const IconChevronDown = ({ isOpen }) => (
  <svg 
    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const IconError = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);

const IconSummary = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
);

const IconHeadingList = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/><path d="M3 10h6v4H3z"/></svg>
);

const IconKeyPoints = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
);

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [openHeadings, setOpenHeadings] = useState({});
  const fileInputRef = useRef(null);

  // Toggle accordion item
  const toggleHeading = (headingTitle) => {
    setOpenHeadings(prev => ({
      ...prev,
      [headingTitle]: !prev[headingTitle]
    }));
  };

  // Handle Drag Events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle Drop Event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Only PDF documents are supported.");
      }
    }
  };

  // Handle File Selector
  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  // Upload to API
  const handleStartAnalysis = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Use configured API URL from environment, or fallback dynamically
      let apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl || apiUrl.includes("localhost")) {
        const backendHost = window.location.hostname || "localhost";
        apiUrl = `http://${backendHost}:8000`;
      }

      const response = await fetch(`${apiUrl}/uploadfile`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      let data = await response.json();
      
      // Parse stringified JSON if LLM returned it as a string
      if (typeof data === "string") {
        try {
          // Robust extraction of JSON object out of potential conversational wrapper text
          const jsonMatch = data.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            data = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Could not find JSON structure in response.");
          }
        } catch (parseError) {
          console.error("Failed to parse response content", parseError);
          data = {
            title: selectedFile.name.replace(/\.[^/.]+$/, ""),
            summary: data,
            headings: [],
            key_points: [],
            keywords: ["Extracted"]
          };
        }
      }

      const safeString = (val) => {
        if (!val) return "";
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
          return val.summary || val.content || val.text || val.value || JSON.stringify(val);
        }
        return String(val);
      };

      // Format document data to make sure key structures exist with fallback naming mapping
      let mainSummary = data.summary || data.Summary || data.executive_summary || data.executiveSummary || data.description;
      const summariesMap = data.summaries || data.Summaries || {};
      if (!mainSummary && Object.keys(summariesMap).length > 0) {
        // Fallback to using the first section's summary as the executive summary
        mainSummary = Object.values(summariesMap)[0];
      }

      const docData = {
        title: safeString(data.title || data.Title || data.document_title || data.documentTitle || selectedFile.name.replace(/\.[^/.]+$/, "")),
        summary: safeString(mainSummary || "No summary provided."),
        headings: (data.headings || data.Headings || data.sections || data.Sections || []).map(safeString),
        summaries: Object.keys(summariesMap).reduce((acc, key) => {
          acc[key] = safeString(summariesMap[key]);
          return acc;
        }, {}),
        key_points: (data.key_points || data.keypoints || data.KeyPoints || data.Key_Points || data.key_takeaways || data.keyTakeaways || []).map(safeString),
        keywords: (data.keywords || data.Keywords || data.tags || data.Tags || []).map(safeString)
      };

      setActiveDoc(docData);
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while analyzing the document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setActiveDoc(null);
    setError(null);
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="navbar-brand" onClick={handleReset} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">
            <IconDocument />
          </div>
          <span className="logo-text">QuickDoc</span>
        </div>
        {activeDoc && (
          <button className="btn-secondary" onClick={handleReset}>
            Analyze Another
          </button>
        )}
      </header>

      {/* Main Content Workspace */}
      <main className="main-content">
        {/* Step 1: Upload / Drag Drop */}
        {!activeDoc && !isLoading && !error && (
          <div className="upload-container">
            <div className="header-section">
              <h1>Document Intelligence</h1>
              <p className="subtitle">Upload a PDF to parse layout structure, key points, and summary</p>
            </div>

            <div 
              className={`dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".pdf"
                onChange={onFileChange} 
              />
              <div className="dropzone-icon">
                <IconUpload />
              </div>
              <div className="dropzone-text">
                <h3>Drag and drop your PDF here</h3>
                <p>or click to browse local files</p>
              </div>
            </div>

            {selectedFile && (
              <div className="selected-file-card">
                <div className="file-info">
                  <IconDocument />
                  <span className="file-name">{selectedFile.name}</span>
                </div>
                <button className="btn-primary start-btn" onClick={handleStartAnalysis}>
                  Start Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="loading-card">
            <div className="scanner-container">
              <div className="scanner-icon">
                <IconDocument />
              </div>
              <div className="scanner-line"></div>
            </div>
            <div>
              <h3 className="pulse-text" style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Analyzing Document
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Reading PDF structure and generating analysis...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="message-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div style={{ color: 'var(--error-color)', marginBottom: '8px' }}>
              <IconError />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Analysis Failed</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
            <button className="btn-primary" onClick={handleReset}>
              Try Again
            </button>
          </div>
        )}

        {/* Output Section */}
        {activeDoc && !isLoading && (
          <div className="results-card">
            <div className="result-header">
              <h2 className="doc-title">{activeDoc.title}</h2>
              {activeDoc.keywords && activeDoc.keywords.length > 0 && (
                <div className="keywords-container">
                  {activeDoc.keywords.map((word, idx) => (
                    <span key={idx} className="keyword-badge">#{word}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid-two-col">
              {/* Left Side: Summary & Keypoints */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="card-inner">
                  <div className="section-title">
                    <IconSummary />
                    <span>Executive Summary</span>
                  </div>
                  <p className="summary-content">{activeDoc.summary}</p>
                </div>

                {activeDoc.key_points && activeDoc.key_points.length > 0 && (
                  <div className="card-inner">
                    <div className="section-title">
                      <IconKeyPoints />
                      <span>Key Takeaways</span>
                    </div>
                    <ul className="keypoints-list">
                      {activeDoc.key_points.map((point, idx) => (
                        <li key={idx} className="keypoint-item">
                          <span className="keypoint-dot"></span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Side: Headings details accordion */}
              <div className="card-inner" style={{ alignSelf: 'start' }}>
                <div className="section-title">
                  <IconHeadingList />
                  <span>Document Structure</span>
                </div>
                {activeDoc.headings && activeDoc.headings.length > 0 ? (
                  <div className="headings-list">
                    {activeDoc.headings.map((headingText, idx) => {
                      const cleanTitle = headingText.replace(/^##\s+/, "");
                      const content = activeDoc.summaries[headingText] || "No summary available for this section.";
                      const isOpen = !!openHeadings[headingText];

                      return (
                        <div key={idx} className="heading-accordion-item">
                          <div 
                            className="heading-accordion-header" 
                            onClick={() => toggleHeading(headingText)}
                          >
                            <span>{cleanTitle}</span>
                            <IconChevronDown isOpen={isOpen} />
                          </div>
                          {isOpen && content && (
                            <div className="heading-accordion-content">
                              {content}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>
                    No structured headings detected.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
