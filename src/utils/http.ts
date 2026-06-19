
const http = axios.create({
  baseURL: ,
  timeout: ,
  headers: {
    'Content-Type': 'application/json'
  }
})

http.interceptors.request.use((config) => {

})

http.interceptors.response.use((config) => {
  
})

export default http