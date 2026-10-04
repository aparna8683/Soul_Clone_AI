
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
      
          <section data-reconstruction-section="0"
            id="financial-infrastructure-to-grow-your-revenue-accept-payments-offer-financial-services-and-implement-custom-revenue-models-from-your-first-transaction-to-your-billionth"
            className="hero layout-center has-bg"
            style={{
              "--hero-min-height": "560px",
              "--hero-image-width": "1180px"
            }}
          >
            <div className="hero-content">

              
                    <h1>
                      Financial infrastructure to grow your revenue. Accept payments, offer financial services and implement custom revenue models – from your first transaction to your billionth.
                    </h1>
                  

              
                    <p className="hero-description">
                      Grow your business with a comprehensive set of payments and financial tools⁠ – designed to work individually or together.
                    </p>
                  

              <div className="hero-actions">
                
          <a
            href="#"
            className="primary-btn"
            
          >
            Products
          </a>
        
          <a
            href="#"
            className="secondary-btn"
            
          >
            Solutions
          </a>
        
              </div>

            </div>

            
                  <div className="hero-image aspect-auto">
                    <img
                      src="/assets/asset-0.webp"
                      alt="Financial infrastructure to grow your revenue. Accept payments, offer financial services and implement custom revenue models – from your first transaction to your billionth."
                    />
                  </div>
                

          </section>
        
    </div>
  );
}
export default App;
