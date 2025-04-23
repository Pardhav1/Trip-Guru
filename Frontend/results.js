document.addEventListener("DOMContentLoaded", function () {
    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    
    // Get trip data from localStorage
    const tripData = JSON.parse(localStorage.getItem('tripData'));
    let isEditMode = false;
    let originalContent = '';

    // Update trip info card immediately
    if (tripData) {
        document.getElementById('tripDestination').textContent = tripData.destination;
        document.getElementById('tripDates').textContent = `${tripData.startDate} to ${tripData.endDate}`;
        document.getElementById('tripCustomization').textContent = tripData.customization || 'Standard trip';
    }

    // Function to format the trip details
    function formatTripDetails(aiResponse, tripData) {
        // First try to parse as JSON if the response is a string
        try {
            if (typeof aiResponse === 'string') {
                aiResponse = JSON.parse(aiResponse);
            }
        } catch (e) {
            // If parsing fails, keep the original response
            console.log('Response is not JSON, using as plain text');
        }

        // If the response is an object with properties, try to extract the content
        if (typeof aiResponse === 'object' && aiResponse !== null) {
            // Try common property names that might contain the itinerary
            aiResponse = aiResponse.message || aiResponse.content || aiResponse.response || aiResponse.itinerary || JSON.stringify(aiResponse);
        }

        // If we still have an object, stringify it
        if (typeof aiResponse === 'object') {
            aiResponse = JSON.stringify(aiResponse, null, 2);
        }

        let formattedHTML = `
            <div class="trip-header">
                <h2 style="color: var(--primary); margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <i class="fas fa-map-marked-alt" style="margin-right: 0.75rem;"></i>
                    ${tripData.destination} Itinerary
                </h2>
                <p style="color: var(--text-light); margin-bottom: 1.5rem;">
                    <i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>
                    This itinerary was generated based on your preferences. Feel free to edit it to match your exact needs.
                </p>
            </div>
            <div class="itinerary-content">
        `;

        // Check if the response contains day markers
        if (aiResponse.includes('Day') || aiResponse.includes('day')) {
            // Split into days if possible
            const daySections = aiResponse.split(/(Day \d+|DAY \d+)/i);
            
            if (daySections.length > 1) {
                // Process each day section
                for (let i = 1; i < daySections.length; i += 2) {
                    const dayTitle = daySections[i];
                    const dayContent = daySections[i+1] || '';
                    
                    formattedHTML += `
                        <div class="day-section">
                            <div class="day-header">
                                <i class="far fa-sun"></i>
                                ${dayTitle}
                            </div>
                            <div class="day-content">${formatDayContent(dayContent)}</div>
                        </div>
                    `;
                }
            } else {
                // No day markers found, display as plain text
                formattedHTML += `<div class="plain-itinerary">${aiResponse.replace(/\n/g, '<br>')}</div>`;
            }
        } else {
            // No day markers found, display as plain text
            formattedHTML += `<div class="plain-itinerary">${aiResponse.replace(/\n/g, '<br>')}</div>`;
        }

        formattedHTML += `</div>`;
        return formattedHTML;
    }

    // Format the content for a single day
    function formatDayContent(content) {
        // Try to split into sections
        const sections = content.split(/(\*\*?[A-Za-z ].+?\*\*?)/g);
        let formattedContent = '';
        
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i].trim();
            if (!section) continue;
            
            // Check if this looks like a section header
            if (section.startsWith('*') && section.endsWith('*')) {
                const sectionTitle = section.replace(/\*/g, '').trim();
                formattedContent += `
                    <h4 class="section-title">
                        <i class="fas fa-${getIconForSection(sectionTitle)}"></i>
                        ${sectionTitle}
                    </h4>
                    <div class="section-content">
                `;
                
                // The next section should be the content
                if (i+1 < sections.length) {
                    const sectionContent = sections[i+1].trim();
                    if (sectionContent) {
                        // Split into bullet points if there are newlines
                        if (sectionContent.includes('\n')) {
                            formattedContent += '<ul class="activity-list">';
                            sectionContent.split('\n').forEach(item => {
                                if (item.trim()) {
                                    formattedContent += `<li>${item.trim()}</li>`;
                                }
                            });
                            formattedContent += '</ul>';
                        } else {
                            formattedContent += `<p>${sectionContent}</p>`;
                        }
                    }
                    i++; // Skip the content we just processed
                }
                
                formattedContent += `</div>`;
            } else if (section) {
                // Not a section header, just add as paragraph
                formattedContent += `<p>${section}</p>`;
            }
        }
        
        return formattedContent || content.replace(/\n/g, '<br>');
    }

    // Get corresponding icon for section title
    function getIconForSection(title) {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('hotel') || lowerTitle.includes('accommodation')) {
            return 'bed';
        } else if (lowerTitle.includes('place') || lowerTitle.includes('sightseeing')) {
            return 'map-marker-alt';
        } else if (lowerTitle.includes('food') || lowerTitle.includes('dining') || lowerTitle.includes('restaurant')) {
            return 'utensils';
        } else if (lowerTitle.includes('activity') || lowerTitle.includes('thing') || lowerTitle.includes('experience')) {
            return 'star';
        } else if (lowerTitle.includes('tip') || lowerTitle.includes('note')) {
            return 'sticky-note';
        } else if (lowerTitle.includes('transport') || lowerTitle.includes('travel')) {
            return 'bus';
        } else {
            return 'file';
        }
    }

    // Load trip data function
    function loadTripData() {
        if (tripData) {
            const { destination, startDate, endDate, customization } = tripData;
            const token = localStorage.getItem("token");

            const prompt = `Create a detailed travel itinerary for a trip to ${destination} from ${startDate} to ${endDate}.`;
            if (customization) {
                prompt += ` Include these preferences: ${customization}`;
            }

            showToast('Generating your itinerary...');

            fetch('http://localhost:5000/api/ai/expense', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt })
            })
            .then(response => {
                if (response.status === 401) {
                    showToast('Session expired. Please log in again.', 'error');
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 2000);
                    return;
                }
                return response.json();
            })
            .then(data => {
                const tripDetailsDiv = document.getElementById('tripDetails');
                if (tripDetailsDiv) {
                    // Always use the fresh AI response first
                    const itineraryContent = data.message || data.content || data.response || JSON.stringify(data);
                    const formattedDetails = formatTripDetails(itineraryContent, tripData);
                    tripDetailsDiv.innerHTML = formattedDetails;
                    
                    // Save original content (without saving to localStorage)
                    originalContent = tripDetailsDiv.innerHTML;
                    showToast('Itinerary generated successfully');
                    
                    // Clear any previously saved edits
                    localStorage.removeItem('editedTripContent');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                const tripDetailsDiv = document.getElementById('tripDetails');
                if (tripDetailsDiv) {
                    tripDetailsDiv.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Failed to load trip details. Please try again later.</p>
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                }
                showToast('Failed to generate itinerary', 'error');
            });
        } else {
            document.getElementById('tripDetails').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-map-marked-alt"></i>
                    <p>No trip data found. Please create a new trip.</p>
                </div>
            `;
            showToast('No trip data found', 'error');
        }
    }

    // Toast notification function
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast';
        
        // Set background color based on type
        if (type === 'error') {
            toast.style.background = 'linear-gradient(135deg, #ff6b6b, #ff8787)';
        } else {
            toast.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-light))';
        }
        
        toast.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Set up edit mode toggle
    window.toggleEditMode = function () {
        const tripDetailsDiv = document.getElementById('tripDetails');
        const editBtn = document.querySelector('.edit-btn');

        if (!isEditMode) {
            // Enter edit mode
            isEditMode = true;

            // Make entire content editable
            tripDetailsDiv.contentEditable = true;

            // Add editing styles
            tripDetailsDiv.classList.add('editing-active');

            // Update button
            editBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            editBtn.classList.add('save-mode');

            // Add editing controls
            addEditingControls();
            
            showToast('Edit mode activated');
        } else {
            // Exit edit mode
            isEditMode = false;

            // Remove editable attribute
            tripDetailsDiv.contentEditable = false;

            // Remove editing styles
            tripDetailsDiv.classList.remove('editing-active');

            // Update button
            editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Edit Itinerary';
            editBtn.classList.remove('save-mode');

            // Save content
            localStorage.setItem('editedTripContent', tripDetailsDiv.innerHTML);
            
            // Remove editing controls
            removeEditingControls();
            
            showToast('Changes saved successfully');
        }
    };

    // Add editing controls
    function addEditingControls() {
        // Add format buttons if they don't exist
        if (!document.getElementById('formatting-toolbar')) {
            const toolbar = document.createElement('div');
            toolbar.id = 'formatting-toolbar';
            
            // Bold button
            const boldBtn = document.createElement('button');
            boldBtn.innerHTML = '<i class="fas fa-bold"></i>';
            boldBtn.onclick = () => document.execCommand('bold', false, null);
            boldBtn.title = 'Bold';

            // Italic button
            const italicBtn = document.createElement('button');
            italicBtn.innerHTML = '<i class="fas fa-italic"></i>';
            italicBtn.onclick = () => document.execCommand('italic', false, null);
            italicBtn.title = 'Italic';

            // Underline button
            const underlineBtn = document.createElement('button');
            underlineBtn.innerHTML = '<i class="fas fa-underline"></i>';
            underlineBtn.onclick = () => document.execCommand('underline', false, null);
            underlineBtn.title = 'Underline';

            // Add buttons to toolbar
            toolbar.appendChild(boldBtn);
            toolbar.appendChild(italicBtn);
            toolbar.appendChild(underlineBtn);
            document.body.appendChild(toolbar);
        }
    }

    // Remove editing controls
    function removeEditingControls() {
        const toolbar = document.getElementById('formatting-toolbar');
        if (toolbar) {
            toolbar.remove();
        }
    }

    window.downloadPDF = function() {
        showToast('Generating PDF...');
        
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            let y = 20;
            
            // Add header
            pdf.setFontSize(20);
            pdf.setTextColor(74, 111, 165);
            pdf.text("Your Trip Itinerary", 105, y, { align: 'center' });
            y += 15;
            
            // Add trip info
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            pdf.text(`Destination: ${document.getElementById('tripDestination').textContent}`, 20, y);
            y += 10;
            pdf.text(`Dates: ${document.getElementById('tripDates').textContent}`, 20, y);
            y += 10;
            pdf.text(`Preferences: ${document.getElementById('tripCustomization').textContent}`, 20, y);
            y += 20;
            
            // Process each day section
            document.querySelectorAll('.day-section').forEach(day => {
                // Add day header
                if (y > 250) {
                    pdf.addPage();
                    y = 20;
                }
                pdf.setFontSize(14);
                pdf.setTextColor(74, 111, 165);
                pdf.text(day.querySelector('.day-header').textContent, 20, y);
                y += 10;
                
                // Process activities
                pdf.setFontSize(10);
                pdf.setTextColor(0, 0, 0);
                day.querySelectorAll('.activity-list li').forEach(activity => {
                    if (y > 280) {
                        pdf.addPage();
                        y = 20;
                    }
                    pdf.text(`• ${activity.textContent.trim()}`, 25, y);
                    y += 7;
                });
                y += 5;
            });
            
            pdf.save('Trip_Itinerary.pdf');
            showToast('PDF downloaded!');
            
        } catch (error) {
            console.error(error);
            showToast('PDF failed', 'error');
        }
    };

    window.goBack = function() {
        window.location.href = "home.html";
    };

    // Initial load of trip data
    loadTripData();
});