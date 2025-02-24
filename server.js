const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// Add a test endpoint to verify server is running
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Update the createAnafApiRequest function to match the C# implementation
const createAnafApiRequest = (formattedCui, currentDate, apiEndpoint) => {
  console.log('Preparing request to ANAF API:', {
    endpoint: apiEndpoint,
    cui: formattedCui,
    date: currentDate
  });

  // Create custom HTTPS agent with settings to bypass common firewall issues
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: false,
    timeout: 60000
  });

  // Important: Format the request data as an array with a single object, matching the C# example
  const requestData = [
    {
      cui: parseInt(formattedCui, 10), // Convert to integer like in C# example
      data: currentDate
    }
  ];

  // Use a more browser-like request to avoid firewall rejection
  return axios({
    method: 'POST',
    url: apiEndpoint,
    data: requestData, // Use the array format
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cache-Control': 'no-cache',
      'Connection': 'close',
      'Content-Length': JSON.stringify(requestData).length.toString()
    },
    httpsAgent,
    timeout: 60000,
    maxRedirects: 0,
    validateStatus: function (status) {
      return status >= 200 && status < 600;
    }
  });
};

// Update the tryDifferentApiVersions function to use v8 first (as in C# example)
const tryDifferentApiVersions = async (formattedCui, currentDate) => {
  // Start with v8 as in the C# example, then try others
  const apiVersions = ['v8', 'v7', 'v6', 'v5', 'v4'];
  
  let lastError = null;
  
  for (const version of apiVersions) {
    try {
      const apiEndpoint = `https://webservicesp.anaf.ro/PlatitorTvaRest/api/${version}/ws/tva`;
      console.log(`Trying API version: ${version}`);
      
      const response = await createAnafApiRequest(formattedCui, currentDate, apiEndpoint);
      
      // Check for successful response based on C# example
      if (response.data && response.data.cod === 200) {
        console.log(`Success with API version: ${version}`);
        return response;
      } else {
        console.log(`API version ${version} returned non-success code: ${response.data?.cod}`);
        lastError = new Error(`API returned code: ${response.data?.cod}, message: ${response.data?.message}`);
      }
    } catch (error) {
      lastError = error;
      console.log(`Failed with API version ${version}: ${error.message}`);
      
      // If it's not a 404 error, don't try other versions
      if (error.response && error.response.status !== 404) {
        throw error;
      }
    }
  }
  
  throw lastError;
};

// Enhanced retry logic with more sophisticated error handling
const axiosRetry = async (fn, retries = 3, initialDelay = 2000, maxDelay = 10000) => {
  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Attempt ${attempt}/${retries} - waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Apply jitter to avoid thundering herd problem
        delay = Math.min(delay * 1.5 + Math.random() * 1000, maxDelay);
      }
      
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`Request failed (attempt ${attempt}/${retries}): ${error.code || error.message}`);
      
      // If we get a definitive error that won't be fixed by retrying, throw immediately
      if (error.response && error.response.status && error.response.status < 500 && error.response.status !== 429) {
        throw error;
      }
    }
  }
  
  throw lastError;
};

app.post('/api/company', async (req, res) => {
  try {
    console.log('Received request for CUI:', req.body.cui);
    
    if (!req.body.cui) {
      return res.status(400).json({ error: 'CUI is required' });
    }

    // Format CUI - remove any non-digit characters
    const formattedCui = req.body.cui.toString().replace(/\D/g, '');

    // Format current date as YYYY-MM-DD
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0];

    // Use the version-trying function instead of a single request
    const companyResponse = await axiosRetry(
      () => tryDifferentApiVersions(formattedCui, currentDate),
      3,
      2000,
      10000
    );

    console.log('ANAF response:', {
      status: companyResponse.status,
      headers: companyResponse.headers,
      data: companyResponse.data
    });

    // Update response handling to match C# example
    if (companyResponse.data && 
        companyResponse.data.cod === 200 && 
        companyResponse.data.found && 
        companyResponse.data.found.length > 0) {
      
      const companyData = companyResponse.data.found[0];
      
      // Format the response data based on C# example
      const formattedData = {
        denumire: companyData.date_generale?.denumire,
        cui: companyData.date_generale?.cui,
        adresa: companyData.date_generale?.adresa,
        nrRegCom: companyData.date_generale?.nrRegCom || '-',
        judet: companyData.adresa_sediu_social?.sdenumireJudet?.replace("MUNICIPIUL BUCUREŞTI", "Bucuresti"),
        localitate: companyData.adresa_sediu_social?.sdenumireLocalitate?.replace(" Mun. Bucureşti", ""),
        stare: companyData.stare_inregistrare || companyData.stare,
        tva: companyData.inregistrare_scop_tva?.scpTVA ? 'DA' : 'NU'
      };

      res.json({ found: [formattedData] });
    } else {
      console.log('No data found or error in response:', {
        cod: companyResponse.data?.cod,
        message: companyResponse.data?.message
      });
      
      res.status(404).json({
        error: 'Nu s-au găsit date',
        details: companyResponse.data?.message || 'Nu există informații pentru acest CUI'
      });
    }
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      stack: error.stack
    });

    // Check for F5 firewall rejection
    if (error.response?.data && typeof error.response.data === 'string' && 
        (error.response.data.includes('requested URL was rejected') || 
         error.response.data.includes('support ID is:'))) {
      
      // Extract support ID if present
      const supportIdMatch = error.response.data.match(/support ID is: ([A-Za-z0-9]+)/);
      const supportId = supportIdMatch ? supportIdMatch[1] : 'unknown';
      
      res.status(403).json({
        error: 'Acces blocat de firewall',
        details: `Cererea a fost blocată de firewall-ul ANAF. ID suport: ${supportId}. Vă rugăm contactați administratorul.`
      });
    } else if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      res.status(503).json({
        error: 'Eroare de conexiune',
        details: 'Nu s-a putut stabili conexiunea cu serverul ANAF după mai multe încercări. Vă rugăm încercați din nou mai târziu.'
      });
    } else if (error.response?.data?.message) {
      res.status(400).json({
        error: 'Eroare API ANAF',
        details: error.response.data.message
      });
    } else if (error.response && error.response.status === 404) {
      res.status(404).json({
        error: 'CUI invalid',
        details: 'Numărul CUI introdus nu este valid'
      });
    } else if (error.response && error.response.status === 429) {
      res.status(429).json({
        error: 'Prea multe cereri',
        details: 'Vă rugăm așteptați câteva momente înainte de a încerca din nou'
      });
    } else {
      res.status(503).json({
        error: 'Serviciul ANAF temporar indisponibil',
        details: 'Vă rugăm să încercați mai târziu'
      });
    }
  }
});

// Create a request function for the e-Factura registry API
const createEFacturaApiRequest = (formattedCui, currentDate) => {
  const apiEndpoint = 'https://webservicesp.anaf.ro/api/registruroefactura/v1/interogare';
  
  console.log('Preparing request to e-Factura API:', {
    endpoint: apiEndpoint,
    cui: formattedCui,
    date: currentDate
  });

  // Create custom HTTPS agent with settings to bypass common firewall issues
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: false,
    timeout: 60000
  });

  // Use a more browser-like request to avoid firewall rejection
  return axios({
    method: 'POST',
    url: apiEndpoint,
    data: [
      {
        cui: parseInt(formattedCui, 10),
        data: currentDate
      }
    ],
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cache-Control': 'no-cache',
      'Connection': 'close'
    },
    httpsAgent,
    timeout: 60000,
    maxRedirects: 0,
    validateStatus: function (status) {
      return status >= 200 && status < 600;
    }
  });
};

// Add a new endpoint for e-Factura registry queries
app.post('/api/efactura', async (req, res) => {
  try {
    console.log('Received e-Factura request for CUI:', req.body.cui);
    
    if (!req.body.cui) {
      return res.status(400).json({ error: 'CUI is required' });
    }

    // Format CUI - remove any non-digit characters
    const formattedCui = req.body.cui.toString().replace(/\D/g, '');

    // Format current date as YYYY-MM-DD
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0];

    // Use retry logic for the API request
    const efacturaResponse = await axiosRetry(
      () => createEFacturaApiRequest(formattedCui, currentDate),
      3,
      2000,
      10000
    );

    console.log('e-Factura API response:', {
      status: efacturaResponse.status,
      headers: efacturaResponse.headers,
      data: efacturaResponse.data
    });

    if (efacturaResponse.data && efacturaResponse.data.found && efacturaResponse.data.found.length > 0) {
      res.json({ 
        found: efacturaResponse.data.found,
        notFound: efacturaResponse.data.notFound || []
      });
    } else if (efacturaResponse.data && efacturaResponse.data.notFound && efacturaResponse.data.notFound.length > 0) {
      res.status(404).json({
        error: 'Nu s-au găsit date în registrul e-Factura',
        details: 'Compania nu este înregistrată în sistemul e-Factura'
      });
    } else {
      res.status(404).json({
        error: 'Nu s-au găsit date',
        details: 'Nu există informații pentru acest CUI în registrul e-Factura'
      });
    }
  } catch (error) {
    console.error('e-Factura API error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      stack: error.stack
    });

    // Check for F5 firewall rejection
    if (error.response?.data && typeof error.response.data === 'string' && 
        (error.response.data.includes('requested URL was rejected') || 
         error.response.data.includes('support ID is:'))) {
      
      // Extract support ID if present
      const supportIdMatch = error.response.data.match(/support ID is: ([A-Za-z0-9]+)/);
      const supportId = supportIdMatch ? supportIdMatch[1] : 'unknown';
      
      res.status(403).json({
        error: 'Acces blocat de firewall',
        details: `Cererea a fost blocată de firewall-ul ANAF. ID suport: ${supportId}. Vă rugăm contactați administratorul.`
      });
    } else if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      res.status(503).json({
        error: 'Eroare de conexiune',
        details: 'Nu s-a putut stabili conexiunea cu serverul ANAF după mai multe încercări. Vă rugăm încercați din nou mai târziu.'
      });
    } else if (error.response?.status === 400) {
      res.status(400).json({
        error: 'Cerere invalidă',
        details: 'Datele transmise nu sunt în formatul corect sau sunt prea multe CUI-uri în cerere.'
      });
    } else if (error.response?.status === 404) {
      res.status(404).json({
        error: 'CUI negăsit',
        details: 'Nu s-au găsit date pentru CUI-ul specificat în registrul e-Factura.'
      });
    } else if (error.response?.status === 429) {
      res.status(429).json({
        error: 'Prea multe cereri',
        details: 'Ați depășit limita de cereri permise (maxim 1 cerere pe secundă).'
      });
    } else {
      res.status(503).json({
        error: 'Serviciul ANAF temporar indisponibil',
        details: 'Vă rugăm să încercați mai târziu'
      });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - http://localhost:${PORT}`);
  console.log('Try with test CUI: 14399840 (Oracle Romania)');
}); 