
import React, { useState } from "react";
import "./styles.css";

function App() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    return (
        <div id="top" className="app">
            
                    <header className="navbar">
                        <div className="navbar-inner">
                            <a href="#top" className="logo">
                                The AI workspace that works for you.
                            </a>

                            <nav className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
                                
                                            <a href="#product" onClick={closeMenu}>
                                                Product
                                            </a>
                                        
                                            <a href="#ai" onClick={closeMenu}>
                                                AI
                                            </a>
                                        
                                            <a href="#resources" onClick={closeMenu}>
                                                Resources
                                            </a>
                                        
                            </nav>

                            <button
                                className="mobile-menu"
                                aria-label="Open navigation"
                                onClick={toggleMenu}
                            >
                                ☰
                            </button>
                        </div>
                    </header>
                

                    <section
                        className="hero "
                        
                    >

                        <div className="hero-content">

                            
                                        <h1>
                                            The AI workspace that works for you.
                                        </h1>
                                    

                            
                                        <p>
                                            Capture context, find answers, and automate tasks with AI built for your team.
                                        </p>
                                    

                            
            <div className="hero-buttons">
                
                            <button className="primary-button">
                                Get Notion free
                            </button>
                        
                            <button className="primary-button">
                                Request a demo
                            </button>
                        
            </div>
        

                        </div>

                        

                    </section>
                

                    <section
                        className="section features-section"
                        
                    >

                        <div className="section-header">

                            
                                        <h2>
                                            See what Notion can do
                                        </h2>
                                    

                            

                        </div>

                        <div className="card-grid">

                            
                    <article className="card">

                        
                                    <div className="card-image">
                                        <img
                                            src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fshared%2Fnavigation%2Fai_group.png&amp;w=384&amp;q=75"
                                            alt="Triage product feedback→"
                                            loading="lazy"
                                        />
                                    </div>
                                

                        <div className="card-content">

                            
                                        <h3>
                                            Triage product feedback→
                                        </h3>
                                    

                            

                        </div>

                    </article>
                
                    <article className="card">

                        
                                    <div className="card-image">
                                        <img
                                            src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_1.webp&amp;w=640&amp;q=75"
                                            alt="Resolve support tickets in Slack→"
                                            loading="lazy"
                                        />
                                    </div>
                                

                        <div className="card-content">

                            
                                        <h3>
                                            Resolve support tickets in Slack→
                                        </h3>
                                    

                            

                        </div>

                    </article>
                
                    <article className="card">

                        
                                    <div className="card-image">
                                        <img
                                            src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_2.webp&amp;w=640&amp;q=75"
                                            alt="Respond to security alerts faster→"
                                            loading="lazy"
                                        />
                                    </div>
                                

                        <div className="card-content">

                            
                                        <h3>
                                            Respond to security alerts faster→
                                        </h3>
                                    

                            

                        </div>

                    </article>
                
                    <article className="card">

                        
                                    <div className="card-image">
                                        <img
                                            src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_3.webp&amp;w=640&amp;q=75"
                                            alt="Automate weekly reporting→"
                                            loading="lazy"
                                        />
                                    </div>
                                

                        <div className="card-content">

                            
                                        <h3>
                                            Automate weekly reporting→
                                        </h3>
                                    

                            

                        </div>

                    </article>
                
                    <article className="card">

                        
                                    <div className="card-image">
                                        <img
                                            src="https://www.notion.com/_next/image?url=%2Ffront-static%2Fpages%2Fhome%2Fteams-agents-hero%2Fpile_4.webp&amp;w=640&amp;q=75"
                                            alt="Create your own developer tools→"
                                            loading="lazy"
                                        />
                                    </div>
                                

                        <div className="card-content">

                            
                                        <h3>
                                            Create your own developer tools→
                                        </h3>
                                    

                            

                        </div>

                    </article>
                

                        </div>

                    </section>
                



                    <section id={section.title ? section.title.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined} className="stats-section">

                        <div className="stats-grid">

                            
                                        <div className="stat-card">

                                            <h3>
                                                100M users in over 50 countries
                                            </h3>

                                            

                                        </div>
                                    
                                        <div className="stat-card">

                                            <h3>
                                                62% of Fortune 100 use Notion
                                            </h3>

                                            

                                        </div>
                                    
                                        <div className="stat-card">

                                            <h3>
                                                G2’s #1 knowledge base for 3 consecutive years
                                            </h3>

                                            

                                        </div>
                                    
                                        <div className="stat-card">

                                            <h3>
                                                Over 50% of YC companies
                                            </h3>

                                            

                                        </div>
                                    
                                        <div className="stat-card">

                                            <h3>
                                                1.4M+ community members
                                            </h3>

                                            

                                        </div>
                                    

                        </div>

                    </section>
                

                    <section className="cta">

                        <div className="cta-content">

                            
                                        <h2>
                                            Get started today.
                                        </h2>
                                    

                            

                            
            <div className="hero-buttons">
                
                            <button className="primary-button">
                                Get Notion free
                            </button>
                        
            </div>
        

                        </div>

                    </section>
                

                    <footer className="footer">

                        <div className="footer-inner">

                            <div className="footer-brand">

                                <h3>
                                    Website
                                </h3>

                                

                            </div>

                            
                                        <div className="footer-links">

                                            
                                                        <a href="#">
                                                            Product
                                                        </a>
                                                    
                                                        <a href="#">
                                                            AI
                                                        </a>
                                                    
                                                        <a href="#">
                                                            Resources
                                                        </a>
                                                    

                                        </div>
                                    

                        </div>

                    </footer>
                
        </div>
    );
}

export default App;
