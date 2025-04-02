document.getElementById('carbonForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const electricity = parseFloat(document.getElementById('electricity').value);
    const gas = parseFloat(document.getElementById('gas').value);
    const transport = parseFloat(document.getElementById('transport').value);

    // Basic carbon footprint calculation
    const carbonFootprint = (electricity * 0.5) + (gas * 5) + (transport * 0.4);

    document.getElementById('carbonOutput').textContent = carbonFootprint.toFixed(2);

    // Send data to the server
    try {
        const response = await fetch('/carbon/store', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                electricity,
                gas,
                transport,
                footprint: carbonFootprint
            })
        });

        const result = await response.json();
        if (result.success) {
            alert('Carbon footprint data stored successfully.');
        } else {
            alert('Error storing data.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});
