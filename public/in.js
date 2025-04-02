
document.getElementById("consultationForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const date = document.getElementById("date").value;
    const notes = document.getElementById("notes").value;

    fetch('/consultation/store', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, email, phone, date, notes })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById("form-message").innerText = "Your consultation request has been submitted!";
            setTimeout(() => { document.getElementById("form-message").innerText = ""; }, 3000);
        } else {
            document.getElementById("form-message").innerText = "Error: " + data.message;
        }
    })
    .catch(error => {
        console.error("Error:", error);
        document.getElementById("form-message").innerText = "An error occurred. Please try again.";
    });
});

