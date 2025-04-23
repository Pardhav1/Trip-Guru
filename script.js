document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logout");
    const profileCard = document.getElementById("profileCard");

    // Logout Button functionality
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    // Profile card dropdown functionality
    if (profileCard) {
        profileCard.addEventListener("click", function(e) {
            e.stopPropagation();
            const dropdown = this.parentNode.querySelector('.group-hover\\:block');
            dropdown.classList.toggle('hidden');
            dropdown.classList.toggle('block');
        });

        // Close dropdown when clicking elsewhere
        document.addEventListener('click', function() {
            const openDropdowns = document.querySelectorAll('.group-hover\\:block.block');
            openDropdowns.forEach(dropdown => {
                dropdown.classList.add('hidden');
                dropdown.classList.remove('block');
            });
        });
    }

    // Check Authentication
    if (window.location.pathname.includes("home.html")) {
        checkAuth();
    }

    // Logout function
    async function handleLogout() {
        try {
            const token = localStorage.getItem("token");

            const res = await fetch("http://localhost:5000/api/auth/logout", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (res.ok) {
                // Clear all user-related data
                localStorage.removeItem("token");
                localStorage.removeItem("tripData");
                localStorage.removeItem("aiResponse");
                
                alert("Logged out successfully!");
                window.location.href = "index.html";
            } else {
                alert("Logout failed! Please try again.");
            }
        } catch (error) {
            console.error("Logout Error:", error);
            alert("Network error. Please try again.");
        }
    }

    // Check if user is authenticated
    async function checkAuth() {
        const token = localStorage.getItem("token");

        if (!token) {
            alert("You are not authenticated! Redirecting to login.");
            window.location.href = "index.html";
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/api/auth/profile", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                await handleLogout(); // Use the logout function to clean up
            }
        } catch (error) {
            console.error("Auth Check Error:", error);
            await handleLogout(); // Use the logout function to clean up
        }
    }

    // Form submission handler
    const tripForm = document.getElementById("tripForm");
    if (tripForm) {
        tripForm.addEventListener("submit", fetchTripDetails);
    }
});

async function fetchTripDetails(event) {
    event.preventDefault();
    const destination = document.getElementById('destination').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const customization = document.getElementById('customization').value;
    const token = localStorage.getItem("token");

    if (!token) {
        alert("You need to be logged in to plan a trip!");
        window.location.href = "index.html";
        return;
    }

    // Store trip data in localStorage
    localStorage.setItem('tripData', JSON.stringify({ 
        destination, 
        startDate, 
        endDate, 
        customization 
    }));

    // Construct the prompt
    const prompt = `Plan a trip to ${destination} from ${startDate} to ${endDate}. Custom preferences: ${customization}. Provide detailed itinerary with:
    - Hotel recommendations
    - Places to visit each day
    - Food recommendations
    - Activities
    - Estimated costs
    - Travel tips`;

    try {
        const response = await fetch('http://localhost:5000/api/ai/expense', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch trip details');
        }

        const data = await response.json();
        
        // Store the AI response in localStorage
        localStorage.setItem('aiResponse', JSON.stringify(data.message));
        
        // Redirect to results page
        window.location.href = 'results.html';
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate trip plan. Please try again.');
    }
}