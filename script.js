function addTextToImage() {
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Load the image
    const image = new Image();
    image.src = 'Burgers4UVoucherDeal1.png'; // Replace with your image URL

    image.onload = function() {
        // Draw the image on the canvas
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Get the voucher code from the input
        const voucherCode = document.getElementById('voucherCode').value;
        
        // Set text properties
        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';

        // Add the text to the canvas
        ctx.fillText(voucherCode, canvas.width / 2, canvas.height / 2);
    };
}
