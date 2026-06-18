import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:5000' });

export default {
  uploadFile: (file, passkey)=>{
    const fd = new FormData(); fd.append('file', file); fd.append('passkey', passkey || '');
    return api.post('/files/upload', fd, { headers: { Authorization: 'Bearer '+localStorage.getItem('token'), 'Content-Type':'multipart/form-data' } }).then(r=>r.data);
  },
  getMyFiles: ()=> api.get('/files/my-files', { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } }).then(r=>r.data),
  deleteFile: (id)=> api.delete('/files/'+id, { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } }).then(r=>r.data),
  downloadFile: (id) =>
    api.get('/files/download/' + id, {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      responseType: 'blob'
    }).then(async res => {
      const ct = res.headers['content-type'] || '';
      // If server returned JSON/text, try to extract error and avoid saving a bogus file
      if (ct.startsWith('application/json') || ct.startsWith('text/')) {
        const text = await res.data.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.error || 'Download failed');
        } catch {
          throw new Error(text || 'Download failed');
        }
      }
      const cd = res.headers['content-disposition'] || '';
      let filename = 'file';
      const match = cd.match(/filename="(.+?)"/);
      if (match) filename = match[1];
      const url = window.URL.createObjectURL(new Blob([res.data], { type: ct || 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }),
  viewFile: (id, passkey, coords) =>
    api.post('/files/view/' + id, { passkey, geo_lat_current: coords?.lat, geo_lon_current: coords?.lng }, {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      responseType: 'blob'
    }).then(res => res),
  downloadWithPasskey: (id, passkey, coords) =>
    api.post('/files/download/' + id, { passkey, geo_lat_current: coords?.lat, geo_lon_current: coords?.lng }, {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      responseType: 'blob'
    }).then(res => {
      const cd = res.headers['content-disposition'] || '';
      let filename = 'file';
      const match = cd.match(/filename="(.+?)"/);
      if (match) filename = match[1];
      const ct = res.headers['content-type'] || 'application/octet-stream';
      const url = window.URL.createObjectURL(new Blob([res.data], { type: ct }));
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    }),
  getSharedFiles: ()=> api.get('/access/shared', { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } }).then(r=>r.data)
};
