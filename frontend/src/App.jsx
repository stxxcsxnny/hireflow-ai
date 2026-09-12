import { useEffect, useState } from "react";
import "./App.css";

const MAX_JD_LENGTH = 5000;
const STORAGE_KEY = "hireflow_recent_analyses";

function App() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState([]);

  // -----------------------------
  // Load history
  // -----------------------------
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
      setRecentAnalyses(JSON.parse(saved));
    } catch (error) {
      console.error("History load error:", error);
      setRecentAnalyses([]);
    }
  }, []);

  // -----------------------------
  // Save history
  // -----------------------------
  const saveRecentAnalysis = (analysis) => {
    const updated = [analysis, ...recentAnalyses].slice(0, 5);

    setRecentAnalyses(updated);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );
  };

  // -----------------------------
  // Clear history
  // -----------------------------
  const clearHistory = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear recent analyses?"
    );

    if (!confirmed) return;

    setRecentAnalyses([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // -----------------------------
  // File handling
  // -----------------------------
  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return;
    }

    // Optional size limit
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("PDF must be smaller than 10 MB.");
      return;
    }

    setFile(selectedFile);
    setResult(null);
  };

  const handleFileChange = (e) => {
    handleFile(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];

    handleFile(droppedFile);
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
  };

  // -----------------------------
  // Analyze candidate
  // -----------------------------
  const analyzeCandidate = async () => {
    if (!file) {
      alert("Please upload a resume.");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please enter the job description.");
      return;
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append(
      "job_description",
      jobDescription.trim()
    );

    try {
      setLoading(true);
      setResult(null);

    const response = await fetch(
  `${import.meta.env.VITE_API_URL}/match-resume`,
  {
    method: "POST",
    body: formData,
  }
);

      const text = await response.text();

      if (!response.ok) {
        throw new Error(
          `Backend ${response.status}: ${text}`
        );
      }

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Backend returned invalid JSON."
        );
      }

      setResult(data);

      // Save complete result so history can be reopened
      const analysis = {
        id: Date.now(),
        filename: file.name,
        score: Number(data.match_score) || 0,
        recommendation:
          data.recommendation || "Not Available",
        createdAt: new Date().toLocaleString(),

        // Save actual result
        result: data,

        // Save JD
        jobDescription: jobDescription.trim(),
      };

      saveRecentAnalysis(analysis);
    } catch (error) {
      console.error("Analysis error:", error);

      alert(
        error?.message ||
          "Something went wrong while analyzing the resume."
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Open previous analysis
  // -----------------------------
  const openRecentAnalysis = (analysis) => {
    if (!analysis.result) {
      alert(
        "This old analysis does not contain the full result."
      );
      return;
    }

    setResult(analysis.result);
    setJobDescription(
      analysis.jobDescription || ""
    );

    // We cannot recreate the original File object
    // from localStorage, so just clear current file.
    setFile(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // -----------------------------
  // Score
  // -----------------------------
  const score = Number(result?.match_score) || 0;

  // Keep score between 0 and 100
  const safeScore = Math.min(
    100,
    Math.max(0, score)
  );

  // -----------------------------
  // Recommendation class
  // -----------------------------
  const getRecommendationClass = () => {
    const recommendation =
      result?.recommendation?.toLowerCase() || "";

    if (
      recommendation.includes("strong") ||
      recommendation.includes("hire")
    ) {
      return "recommendation strong";
    }

    if (
      recommendation.includes("weak") ||
      recommendation.includes("reject") ||
      recommendation.includes("not recommended")
    ) {
      return "recommendation weak";
    }

    return "recommendation average";
  };

  // -----------------------------
  // Score message
  // -----------------------------
  const getScoreMessage = () => {
    if (safeScore >= 80) {
      return "Excellent Match";
    }

    if (safeScore >= 60) {
      return "Good Match";
    }

    if (safeScore >= 40) {
      return "Moderate Match";
    }

    return "Low Match";
  };

  return (
    <div className="app">
      {/* =====================================
          SIDEBAR
      ====================================== */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            H
          </div>

          <div>
            <h2>HireFlow</h2>
            <span>AI Screening</span>
          </div>
        </div>

        <nav className="nav">
          <button
            className="nav-item active"
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            <span>⌂</span>
            Home
          </button>

          

          <button
            className="nav-item"
            type="button"
            onClick={() => {
              document
                .querySelector(".recent-section")
                ?.scrollIntoView({
                  behavior: "smooth",
                });
            }}
          >
            <span>◷</span>
            History
          </button>

          <button
            className="nav-item"
            type="button"
            onClick={() =>
              alert(
                "Settings will be available soon."
              )
            }
          >
            <span>⚙</span>
            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <p>AI-powered hiring</p>
          <span>
            Built for faster decisions.
          </span>
        </div>
      </aside>

      {/* =====================================
          MAIN
      ====================================== */}

      <main className="main">
        {/* TOPBAR */}

        <header className="topbar">
          <div>
            <p className="eyebrow">
              HIREFLOW AI
            </p>

            <h1>
              Resume <span>Screening</span>
            </h1>

            <p className="subtitle">
              Upload a resume and job description
              to analyze candidate fit.
            </p>
          </div>

        {/*  <div className="profile">
            <div className="avatar">
              SK
            </div>

            <div>
              <strong>
                Sunny Kumar
              </strong>

              <small>
                Recruiter
              </small>
            </div>
          </div>*/}
        </header>

        {/* =====================================
            WORKSPACE
        ====================================== */}

        <section className="workspace">
          {/* =================================
              LEFT INPUT CARD
          ================================== */}

          <div className="card input-card">
            {/* Resume */}

            <div className="section-heading">
              <div className="step">
                01
              </div>

              <div>
                <h3>
                  Candidate Resume
                </h3>

                <p>
                  Upload the candidate's PDF
                  resume.
                </p>
              </div>
            </div>

            {!file ? (
              <label
                className={`dropzone ${
                  dragActive
                    ? "drag-active"
                    : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() =>
                  setDragActive(false)
                }
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={
                    handleFileChange
                  }
                />

                <div className="upload-icon">
                  ↑
                </div>

                <strong>
                  Drop your resume here
                </strong>

                <span>
                  or click to browse • PDF
                  only • Max 10 MB
                </span>
              </label>
            ) : (
              <div className="file-preview">
                <div className="pdf-icon">
                  PDF
                </div>

                <div className="file-info">
                  <strong>
                    {file.name}
                  </strong>

                  <span>
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </span>

                  <small>
                    PDF selected successfully
                  </small>
                </div>

                <button
                  className="remove-file"
                  onClick={
                    removeFile
                  }
                  type="button"
                  title="Remove file"
                >
                  ×
                </button>
              </div>
            )}

            {/* Job Description */}

            <div className="section-heading jd-heading">
              <div className="step">
                02
              </div>

              <div>
                <h3>
                  Job Description
                </h3>

                <p>
                  Paste the job requirements
                  below.
                </p>
              </div>
            </div>

            <textarea
              value={jobDescription}
              maxLength={
                MAX_JD_LENGTH
              }
              onChange={(e) =>
                setJobDescription(
                  e.target.value
                )
              }
              placeholder="Example: We are looking for a Python developer with experience in FastAPI, PostgreSQL, REST APIs..."
            />

            <div className="textarea-footer">
              <span>
                Paste the complete JD for
                better matching
              </span>

              <span>
                {jobDescription.length}/
                {MAX_JD_LENGTH}
              </span>
            </div>

            {/* Analyze */}

            <button
              className="analyze-btn"
              onClick={
                analyzeCandidate
              }
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>

                  Analyzing candidate...
                </>
              ) : (
                <>
                  <span>✦</span>

                  Analyze Candidate

                  <span>→</span>
                </>
              )}
            </button>
          </div>

          {/* =================================
              RIGHT RESULT CARD
          ================================== */}

          <div className="card result-card">
            <div className="result-header">
              <div>
                <p className="eyebrow">
                  ANALYSIS
                </p>

                <h3>
                  Candidate Overview
                </h3>
              </div>

              <span className="status-pill">
                {loading
                  ? "Analyzing"
                  : result
                  ? "Completed"
                  : "Ready"}
              </span>
            </div>

            {/* EMPTY */}

            {!result && !loading && (
              <div className="empty-result">
                <div className="empty-icon">
                  ✦
                </div>

                <h2>
                  Your analysis will
                  appear here
                </h2>

                <p>
                  Upload a resume and add
                  a job description to
                  generate an AI-powered
                  candidate match report.
                </p>
              </div>
            )}

            {/* LOADING */}

            {loading && (
              <div className="analysis-loading">
                <div className="loading-orb">
                  ✦
                </div>

                <h2>
                  Analyzing candidate...
                </h2>

                <p>
                  Extracting resume data
                  and comparing skills
                  with the job description.
                </p>
              </div>
            )}

            {/* RESULT */}

            {result && !loading && (
              <div className="analysis-result">
                {/* =========================
                    SCORE
                ========================== */}

                <div className="score-section">
                  <div
                    className="score-circle"
                    style={{
                      "--score": `${
                        safeScore * 3.6
                      }deg`,
                    }}
                  >
                    <div className="score-inner">
                      <strong>
                        {safeScore}
                      </strong>

                      <span>
                        /100
                      </span>
                    </div>
                  </div>

                  <div className="score-content">
                    <p className="eyebrow">
                      MATCH SCORE
                    </p>

                    <h2>
                      {getScoreMessage()}
                    </h2>

                    <div
                      className={getRecommendationClass()}
                    >
                      {result.recommendation ||
                        "No recommendation"}
                    </div>
                  </div>
                </div>

                {/* =========================
                    QUICK STATS
                ========================== */}

                <div className="analysis-stats">
                  <div className="stat-card">
                    <span>
                      Matching
                    </span>

                    <strong>
                      {
                        result
                          .matching_skills
                          ?.length || 0
                      }
                    </strong>
                  </div>

                  <div className="stat-card">
                    <span>
                      Missing
                    </span>

                    <strong>
                      {
                        result
                          .missing_skills
                          ?.length || 0
                      }
                    </strong>
                  </div>

                  <div className="stat-card">
                    <span>
                      Strengths
                    </span>

                    <strong>
                      {
                        result
                          .strengths
                          ?.length || 0
                      }
                    </strong>
                  </div>

                  <div className="stat-card">
                    <span>
                      Weaknesses
                    </span>

                    <strong>
                      {
                        result
                          .weaknesses
                          ?.length || 0
                      }
                    </strong>
                  </div>
                </div>

                {/* =========================
                    MATCHING SKILLS
                ========================== */}

                <div className="result-section">
                  <div className="result-section-header">
                    <h3>
                      Matching Skills
                    </h3>

                    <span>
                      {
                        result
                          .matching_skills
                          ?.length || 0
                      }
                    </span>
                  </div>

                  <div className="skill-grid">
                    {result.matching_skills
                      ?.length ? (
                      result.matching_skills.map(
                        (
                          skill,
                          index
                        ) => (
                          <div
                            className="skill-card matched"
                            key={index}
                          >
                            <span>
                              ✓
                            </span>

                            {skill}
                          </div>
                        )
                      )
                    ) : (
                      <p>
                        No matching
                        skills found.
                      </p>
                    )}
                  </div>
                </div>

                {/* =========================
                    MISSING SKILLS
                ========================== */}

                <div className="result-section">
                  <div className="result-section-header">
                    <h3>
                      Missing Skills
                    </h3>

                    <span>
                      {
                        result
                          .missing_skills
                          ?.length || 0
                      }
                    </span>
                  </div>

                  <div className="skill-grid">
                    {result.missing_skills
                      ?.length ? (
                      result.missing_skills.map(
                        (
                          skill,
                          index
                        ) => (
                          <div
                            className="skill-card missing"
                            key={index}
                          >
                            <span>
                              ×
                            </span>

                            {skill}
                          </div>
                        )
                      )
                    ) : (
                      <p>
                        No major missing
                        skills.
                      </p>
                    )}
                  </div>
                </div>

                {/* =========================
                    STRENGTHS / WEAKNESSES
                ========================== */}

                <div className="result-columns">
                  <div className="result-section insight-box">
                    <h3>
                      Strengths
                    </h3>

                    {result.strengths
                      ?.length ? (
                      <ul>
                        {result.strengths.map(
                          (
                            item,
                            index
                          ) => (
                            <li
                              key={index}
                            >
                              {item}
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p>
                        No strengths
                        identified.
                      </p>
                    )}
                  </div>

                  <div className="result-section insight-box">
                    <h3>
                      Weaknesses
                    </h3>

                    {result.weaknesses
                      ?.length ? (
                      <ul>
                        {result.weaknesses.map(
                          (
                            item,
                            index
                          ) => (
                            <li
                              key={index}
                            >
                              {item}
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p>
                        No major
                        weaknesses
                        identified.
                      </p>
                    )}
                  </div>
                </div>

                {/* =========================
                    FINAL RECOMMENDATION
                ========================== */}

                <div className="final-recommendation">
                  <div>
                    <p className="eyebrow">
                      RECRUITER VERDICT
                    </p>

                    <h3>
                      AI Recommendation
                    </h3>
                  </div>

                  <div
                    className={getRecommendationClass()}
                  >
                    {result.recommendation ||
                      "Not Available"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =====================================
            RECENT ANALYSES
        ====================================== */}

        <section className="recent-section">
          <div className="recent-header">
            <div>
              <p className="eyebrow">
                HISTORY
              </p>

              <h2>
                Recent Analyses
              </h2>
            </div>

            <div className="recent-actions">
              <span>
                Local storage
              </span>

              {recentAnalyses.length >
                0 && (
                <button
                  type="button"
                  onClick={
                    clearHistory
                  }
                  className="clear-history"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {recentAnalyses.length ===
          0 ? (
            <div className="recent-empty">
              No recent analyses yet.
            </div>
          ) : (
            <div className="recent-list">
              {recentAnalyses.map(
                (analysis) => (
                  <button
                    className="recent-item"
                    key={analysis.id}
                    type="button"
                    onClick={() =>
                      openRecentAnalysis(
                        analysis
                      )
                    }
                  >
                    <div className="recent-file">
                      <div className="mini-pdf">
                        PDF
                      </div>

                      <div>
                        <strong>
                          {
                            analysis.filename
                          }
                        </strong>

                        <span>
                          {
                            analysis.createdAt
                          }
                        </span>
                      </div>
                    </div>

                    <div className="recent-score">
                      <strong>
                        {analysis.score}%
                      </strong>

                      <span>
                        {
                          analysis.recommendation
                        }
                      </span>
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;