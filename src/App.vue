<template>
  <div class="vaporwave-container">
    <div class="dot-matrix-overlay"></div>
    
    <div class="header">
      <div class="small-header">ANAF EXPLORER PRESENTS</div>
      <div class="title-box">
        <div class="title-text">FISCAL DATA LOOKUP</div>
      </div>
      
      <div class="pixel-logo">
        ANAF<span class="highlight">Explorer</span>
      </div>
      
      <div class="subtitle">
        ANAF Explorer retrieves company information from the
        Romanian fiscal database using official ANAF APIs.
      </div>
    </div>
    
    <div class="search-container">
      <div class="input-wrapper">
        <input 
          type="text" 
          v-model="cui" 
          placeholder="Enter company CUI number..." 
          @keyup.enter="searchCompany"
          class="search-input"
        />
        <button @click="searchCompany" class="search-button">SEARCH</button>
      </div>
      
      <div v-if="loading" class="loading-container">
        <div class="loading-text">AND LOADING...</div>
      </div>
      
      <div v-if="error" class="error-box">
        {{ error }}
      </div>
    </div>
    
    <div v-if="companyData" class="results-container">
      <div class="result-box">
        <div class="result-header">COMPANY INFORMATION</div>
        <div class="result-grid">
          <div class="result-item">
            <div class="result-label">DENUMIRE</div>
            <div class="result-value">{{ companyData.denumire }}</div>
          </div>
          <div class="result-item">
            <div class="result-label">CUI</div>
            <div class="result-value">{{ companyData.cui }}</div>
          </div>
          <div class="result-item">
            <div class="result-label">ADRESA</div>
            <div class="result-value">{{ companyData.adresa }}</div>
          </div>
          <div class="result-item">
            <div class="result-label">REG.COM</div>
            <div class="result-value">{{ companyData.nrRegCom }}</div>
          </div>
          <div class="result-item">
            <div class="result-label">JUDET</div>
            <div class="result-value">{{ companyData.judet }}</div>
          </div>
          <div class="result-item">
            <div class="result-label">LOCALITATE</div>
            <div class="result-value">{{ companyData.localitate }}</div>
          </div>
          <div class="result-item">
            <div class="result-label">STARE</div>
            <div class="result-value">{{ companyData.stare }}</div>
          </div>
          <div class="result-item">
            <div class="result-label">PLATITOR TVA</div>
            <div class="result-value">{{ companyData.tva }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="api-credits">
        POWERED BY ANAF API
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',
  data() {
    return {
      cui: '',
      companyData: null,
      loading: false,
      error: null
    };
  },
  methods: {
    async searchCompany() {
      if (!this.cui) {
        this.error = 'PLEASE ENTER A VALID CUI NUMBER';
        return;
      }
      
      this.loading = true;
      this.error = null;
      this.companyData = null;
      
      try {
        const response = await axios.post('http://localhost:3000/api/company', {
          cui: this.cui
        });
        
        if (response.data && response.data.found && response.data.found.length > 0) {
          this.companyData = response.data.found[0];
        } else {
          this.error = 'NO DATA FOUND FOR SPECIFIED CUI';
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        this.error = error.response?.data?.error || 'CONNECTION ERROR';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Roboto+Mono:wght@400;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Roboto Mono', monospace;
  background: linear-gradient(135deg, #a6c0fe 0%, #8abfff 100%);
  min-height: 100vh;
  color: #111;
  overflow-x: hidden;
}

.vaporwave-container {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  z-index: 1;
}

.dot-matrix-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: radial-gradient(#000 1px, transparent 1px);
  background-size: 4px 4px;
  opacity: 0.1;
  pointer-events: none;
  z-index: 2;
}

.header {
  text-align: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 3;
}

.small-header {
  font-size: 14px;
  letter-spacing: 2px;
  margin-bottom: 10px;
  font-weight: bold;
}

.title-box {
  background-color: #0a1a2f;
  padding: 10px 20px;
  display: inline-block;
  margin-bottom: 30px;
}

.title-text {
  color: white;
  font-size: 18px;
  letter-spacing: 2px;
  font-weight: bold;
}

.pixel-logo {
  font-family: 'VT323', monospace;
  font-size: 80px;
  line-height: 1;
  letter-spacing: -2px;
  margin-bottom: 20px;
  color: white;
  text-shadow: 2px 2px 0 #0a1a2f;
}

.highlight {
  position: relative;
}

.highlight::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background-color: #0a1a2f;
}

.subtitle {
  max-width: 600px;
  margin: 0 auto;
  font-size: 16px;
  line-height: 1.5;
}

.search-container {
  margin-bottom: 40px;
  position: relative;
  z-index: 3;
}

.input-wrapper {
  display: flex;
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  flex: 1;
  padding: 12px 15px;
  font-family: 'Roboto Mono', monospace;
  font-size: 16px;
  border: 2px solid #0a1a2f;
  background-color: rgba(255, 255, 255, 0.9);
  outline: none;
}

.search-button {
  padding: 12px 20px;
  background-color: #0a1a2f;
  color: white;
  font-family: 'Roboto Mono', monospace;
  font-size: 16px;
  font-weight: bold;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

.search-button:hover {
  background-color: #152a45;
}

.loading-container {
  text-align: center;
  margin-top: 30px;
}

.loading-text {
  display: inline-block;
  font-size: 14px;
  letter-spacing: 2px;
  font-weight: bold;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.error-box {
  max-width: 600px;
  margin: 20px auto 0;
  padding: 15px;
  background-color: rgba(255, 100, 100, 0.2);
  border: 2px solid #ff6464;
  color: #d30000;
  font-weight: bold;
  text-align: center;
}

.results-container {
  position: relative;
  z-index: 3;
}

.result-box {
  background-color: rgba(255, 255, 255, 0.8);
  border: 2px solid #0a1a2f;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.result-header {
  background-color: #0a1a2f;
  color: white;
  padding: 10px 15px;
  font-weight: bold;
  margin: -20px -20px 20px;
  letter-spacing: 1px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.result-item {
  margin-bottom: 5px;
}

.result-label {
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #0a1a2f;
}

.result-value {
  font-size: 16px;
  word-break: break-word;
}

.footer {
  margin-top: 60px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 2px;
  position: relative;
  z-index: 3;
}

.api-credits {
  opacity: 0.7;
  font-weight: bold;
}

@media (max-width: 768px) {
  .pixel-logo {
    font-size: 50px;
  }
  
  .result-grid {
    grid-template-columns: 1fr;
  }
  
  .input-wrapper {
    flex-direction: column;
  }
  
  .search-button {
    margin-top: 10px;
  }
}
</style> 