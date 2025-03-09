const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Replace with your Imgur client ID


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


  //example fetch
  try {
    const endpoint = filterType === "friends" ? "feed" : "explore";
    const response = await fetch(`http://localhost:3000/post/${endpoint}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    });
    const result = await response.json();
    return result.data;
} catch (error) {
    console.error('Error fetching posts:', error);
    return [];
}

