import axios from 'axios';

const api = axios.create({
  baseURL: ' https://render.com/docs/web-services#port-binding', 
  withCredentials: true, // CRUCIAL: Tells the browser to send cookies along with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
