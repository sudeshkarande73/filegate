import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Your local Node backend URL
  withCredentials: true, // CRUCIAL: Tells the browser to send cookies along with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;