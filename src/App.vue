<template>
  <div id="app">
    <header>
      <h1>ANAF Explorer</h1>
    </header>
    <div class="container">
      <div class="search-section">
        <h2>Verificare CUI / CIF</h2>
        <div class="search-box">
          <input 
            v-model="cui" 
            type="text" 
            placeholder="Introduceți CUI/CIF"
            @keyup.enter="searchCompany"
          >
          <button @click="searchCompany" :disabled="!cui">Caută</button>
        </div>
      </div>

      <div v-if="loading" class="loading">
        Se încarcă...
      </div>

      <div v-if="error" class="error">
        <strong>{{ error }}</strong>
        <div v-if="errorDetails" class="error-details">
          {{ errorDetails }}
        </div>
      </div>

      <div v-if="companyData" class="company-details">
        <h3>Detalii Companie</h3>
        <div class="details-grid">
          <div class="detail-item">
            <span class="label">Denumire:</span>
            <span class="value">{{ companyData.denumire }}</span>
          </div>
          <div class="detail-item">
            <span class="label">CUI:</span>
            <span class="value">{{ companyData.cui }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Adresă:</span>
            <span class="value">{{ companyData.adresa }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Stare:</span>
            <span class="value" :class="companyData.stare === 'ACTIVA' ? 'active' : 'inactive'">
              {{ companyData.stare }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      cui: '',
      companyData: null,
      loading: false,
      error: null,
      errorDetails: null,
      serverUrl: 'http://localhost:3000'
    }
  },
  mounted() {
    // Test server connection on component mount
    this.testServerConnection();
  },
  methods: {
    async testServerConnection() {
      try {
        const response = await fetch(`${this.serverUrl}/test`);
        if (!response.ok) {
          console.error('Server test failed:', await response.text());
        } else {
          console.log('Server connection successful');
        }
      } catch (err) {
        console.error('Server connection failed:', err);
      }
    },
    async searchCompany() {
      if (!this.cui) return;
      
      this.loading = true;
      this.error = null;
      this.errorDetails = null;
      this.companyData = null;

      try {
        const response = await fetch(`${this.serverUrl}/api/company`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cui: this.cui.trim()
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Eroare server (${response.status})`);
        }

        if (data && data.found && data.found[0]) {
          this.companyData = data.found[0];
        } else {
          this.error = 'Nu s-au găsit informații pentru acest CUI';
          this.errorDetails = data.details;
        }
      } catch (err) {
        console.error('Search error:', err);
        this.error = err.message;
        this.errorDetails = 'Verificați dacă serverul este pornit și CUI-ul este corect.';
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  color: #2c3e50;
}

header {
  background-color: #1e3799;
  color: white;
  padding: 1rem;
  text-align: center;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.search-section {
  text-align: center;
  margin-bottom: 2rem;
}

.search-box {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

input {
  padding: 0.5rem;
  width: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 0.5rem 1rem;
  background-color: #1e3799;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  color: #666;
}

.error {
  color: #dc3545;
  text-align: center;
  padding: 1rem;
  background-color: #ffe6e6;
  border-radius: 4px;
}

.company-details {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.details-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.detail-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1rem;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.label {
  font-weight: bold;
  color: #666;
}

.active {
  color: #28a745;
  font-weight: bold;
}

.inactive {
  color: #dc3545;
  font-weight: bold;
}

.error-details {
  margin-top: 0.5rem;
  font-size: 0.9em;
  color: #666;
}
</style> 