const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
//hello
// Replace with your Imgur client ID
const clientId = 'b0a9f05aa05f45b';

// Path to the image you want to upload
const imagePath = 'download.jpeg';

// Create a form and append the image file
const form = new FormData();
form.append('image', fs.createReadStream(imagePath));

// Send the POST request to the Imgur API
axios.post('https://api.imgur.com/3/upload', form, {
  headers: {
    ...form.getHeaders(),
    Authorization: `Client-ID ${clientId}`
  }
})
  .then(response => {
    console.log('Image uploaded successfully! URL:', response.data.data.link);
  })
  .catch(error => {
    console.error('Error uploading image:', error.message);
  });
