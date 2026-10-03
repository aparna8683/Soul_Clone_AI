
import React, { useState } from "react";
import "./styles.css";

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div id="top" className="app">
      
          <header className="navbar">
            <div className="navbar-inner">

              <a href="#top" className="brand">
                The AI workspace that works for you.
              </a>

              <button
                className="mobile-menu-button"
                onClick={toggleMenu}
                aria-label="Toggle navigation"
              >
                ☰
              </button>

              <nav className={"nav-links " + (isMobileMenuOpen ? "open" : "")}>
                
                      <a
                        href="#product"
                        onClick={closeMenu}
                      >
                        Product
                      </a>
                    
                      <a
                        href="#ai"
                        onClick={closeMenu}
                      >
                        AI
                      </a>
                    
                      <a
                        href="#resources"
                        onClick={closeMenu}
                      >
                        Resources
                      </a>
                    
                      <a
                        href="#get-notion-free"
                        onClick={closeMenu}
                      >
                        Get Notion free
                      </a>
                    
                      <a
                        href="#request-a-demo"
                        onClick={closeMenu}
                      >
                        Request a demo
                      </a>
                    
              </nav>

            </div>
          </header>
        

          <section
            id="where-teams-and-agents-ship-together"
            className="hero center"
          >
            <div className="hero-content">

              
                    <h1>
                      Where teams and agents Ship together.
                    </h1>
                  

              
                    <p className="hero-description">
                      Capture context, find answers, and automate tasks with AI built for your team.
                    </p>
                  

              <div className="hero-actions">
                
          <button
            className="primary-btn"
          >
            Get Notion free
          </button>
        
          <button
            className="secondary-btn"
          >
            Request a demo
          </button>
        
              </div>

            </div>

            

          </section>
        

          <section
            id="features-3"
            className="section features-section"
          >

            

            <div className="features-grid">
              
          <div className="content-card">
            
                  <div className="card-image">
                    <img
                      src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fshared%2Fnavigation%2Fai_group.png&amp;w=384&amp;q=75"
                      alt="AI where your team works."
                    />
                  </div>
                

            <div className="card-content">
              <h3>AI where your team works.</h3>

              <p>Get answers, instantly—with citations.</p>
            </div>
          </div>
        
          <div className="content-card">
            
                  <div className="card-image">
                    <img
                      src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_1.webp&amp;w=640&amp;q=75"
                      alt="Bring everything into one system of record."
                    />
                  </div>
                

            <div className="card-content">
              <h3>Bring everything into one system of record.</h3>

              <p>Keep work moving 24/7 with agents.</p>
            </div>
          </div>
        
            </div>

          </section>
        

          <section
            id="see-what-notion-can-do"
            className="section resources"
          >

            
                  <div className="section-heading">
                    <h2>
                      See what Notion can do
                    </h2>
                  </div>
                

            <div className="resources-grid">
              
          <div className="content-card">
            
                  <div className="card-image">
                    <img
                      src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_2.webp&amp;w=640&amp;q=75"
                      alt="Triage product feedback→"
                    />
                  </div>
                

            <div className="card-content">
              <h3>Triage product feedback→</h3>

              
            </div>
          </div>
        
          <div className="content-card">
            
                  <div className="card-image">
                    <img
                      src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_3.webp&amp;w=640&amp;q=75"
                      alt="Resolve support tickets in Slack→"
                    />
                  </div>
                

            <div className="card-content">
              <h3>Resolve support tickets in Slack→</h3>

              
            </div>
          </div>
        
          <div className="content-card">
            
                  <div className="card-image">
                    <img
                      src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_4.webp&amp;w=640&amp;q=75"
                      alt="Respond to security alerts faster→"
                    />
                  </div>
                

            <div className="card-content">
              <h3>Respond to security alerts faster→</h3>

              
            </div>
          </div>
        
          <div className="content-card">
            
                  <div className="card-image">
                    <img
                      src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_5.webp&amp;w=640&amp;q=75"
                      alt="Automate weekly reporting→"
                    />
                  </div>
                

            <div className="card-content">
              <h3>Automate weekly reporting→</h3>

              
            </div>
          </div>
        
          <div className="content-card">
            
                  <div className="card-image">
                    <img
                      src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_6.webp&amp;w=640&amp;q=75"
                      alt="Create your own developer tools→"
                    />
                  </div>
                

            <div className="card-content">
              <h3>Create your own developer tools→</h3>

              
            </div>
          </div>
        
            </div>

          </section>
        

          <section
            id="trusted-by-teams-that-ship"
            className="stats-section"
          >

            
                  <div className="section-heading">
                    <h2>
                      Trusted by teams that ship.
                    </h2>
                  </div>
                

            <div className="stats-grid">
              
                      <div className="stat-card">

                        
                              <div className="stat-value">
                                100M users in over 50 countries
                              </div>
                            

                        

                      </div>
                    
                      <div className="stat-card">

                        
                              <div className="stat-value">
                                Over 50% of YC companies
                              </div>
                            

                        

                      </div>
                    
                      <div className="stat-card">

                        
                              <div className="stat-value">
                                1.4M+ community members
                              </div>
                            

                        

                      </div>
                    
                      <div className="stat-card">

                        
                              <div className="stat-value">
                                62% of Fortune 100 use Notion
                              </div>
                            

                        

                      </div>
                    
                      <div className="stat-card">

                        
                              <div className="stat-value">
                                G2’s #1 knowledge base for 3 consecutive years
                              </div>
                            

                        

                      </div>
                    
            </div>

          </section>
        

          <section
            id="get-started-today"
            className="cta"
          >

            
                  <h2>
                    Get started today.
                  </h2>
                

            
                  <p>
                    The most ambitious companies run on Notion.
                  </p>
                

            <div className="cta-actions">
              
          <button
            className="primary-btn"
          >
            Get Notion free
          </button>
        
            </div>

          </section>
        

          <footer className="footer">

            <div className="footer-inner">

              <div className="footer-brand">
                The AI workspace that works for you.
              </div>

              <div className="footer-links">

                
                      <a
                        href="#product"
                        onClick={closeMenu}
                      >
                        Product
                      </a>
                    
                      <a
                        href="#ai"
                        onClick={closeMenu}
                      >
                        AI
                      </a>
                    
                      <a
                        href="#resources"
                        onClick={closeMenu}
                      >
                        Resources
                      </a>
                    
                      <a
                        href="#get-notion-free"
                        onClick={closeMenu}
                      >
                        Get Notion free
                      </a>
                    
                      <a
                        href="#request-a-demo"
                        onClick={closeMenu}
                      >
                        Request a demo
                      </a>
                    

              </div>

            </div>

          </footer>
        
    </div>
  );
}

export default App;
