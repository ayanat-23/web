document.addEventListener('DOMContentLoaded', function() {
    // Helper function to get friends from localStorage safely
    function getFriendsFromStorage() {
        try {
            const friendsStr = localStorage.getItem('connectHubFriends');
            if (friendsStr && friendsStr.trim() !== "") { // Ensure string is not null or just whitespace
                const parsedFriends = JSON.parse(friendsStr);
                return Array.isArray(parsedFriends) ? parsedFriends : []; // Ensure it's an array
            }
            return []; // Return empty array if no data or empty string
        } catch (e) {
            console.error("Error parsing friends from localStorage:", e);
            return []; // Return empty array on error
        }
    }

    // Initialize friends storage if it doesn't exist - WITH AN EMPTY ARRAY
    if (!localStorage.getItem('connectHubFriends')) {
        const initialFriends = []; // NO DEFAULT FRIENDS ARE PRE-FILLED
        localStorage.setItem('connectHubFriends', JSON.stringify(initialFriends));
    }

    // Helper function to get full name from username
    function getFriendNameFromUsername(username) {
        const nameMap = {
            'sabynzhan': 'Sabina Samatova',
            'qasholiq': 'Gulnaz Moldagaliyeva',
            'ayyyannat1': 'Ayanat Kabdygaliyeva',
            'tlebaldinaa_': 'Inkar Tlebaldina'
        };
        return nameMap[username.toLowerCase()] || username;
    }

    // Function to display notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Function to update friend count on friends page
    function updateFriendCount() {
        const friendCountElement = document.getElementById('friendCount');
        if (friendCountElement) {
            const friends = getFriendsFromStorage();
            friendCountElement.textContent = friends.length;
        }
    }

    // Function to add a new friend to localStorage and update UI
    function addFriendToList(friendId, name, image, buttonElement) {
        let friends = getFriendsFromStorage();
        const idAsInt = parseInt(friendId);

        if (isNaN(idAsInt)) {
            console.error("Invalid friendId passed to addFriendToList:", friendId);
            return;
        }
        
        if (!friends.some(f => f.id === idAsInt)) {
            const currentDate = new Date();
            const month = currentDate.toLocaleString('default', { month: 'short' });
            const year = currentDate.getFullYear();
            
            friends.push({
                id: idAsInt,
                name: name,
                image: image,
                connected: `${month} ${year}`,
                online: Math.random() > 0.5
            });
            
            localStorage.setItem('connectHubFriends', JSON.stringify(friends));
            updateFriendCount(); 
            
            if (buttonElement) {
                buttonElement.textContent = 'Added';
                buttonElement.classList.add('added'); // This class is styled in friend-connect.css
                buttonElement.disabled = true;
            }
            showNotification(`${name} has been added to your friends list!`);
            
            if (document.getElementById('friendsListContainer')) {
                loadFriends();
            }
        } else {
            if (buttonElement) { 
                buttonElement.textContent = 'Added';
                buttonElement.classList.add('added');
                buttonElement.disabled = true;
            }
        }
    }

    // Function to handle adding a friend from news feed suggestions
    function addFriendFromNewsFeed(friendIdStr, buttonElement) {
        const friendId = parseInt(friendIdStr);
        if (isNaN(friendId)) {
            console.error("Invalid friendId from news feed button:", friendIdStr);
            return;
        }

        const friendElement = buttonElement.closest('.friend-suggestion');
        const nameElement = friendElement.querySelector('h4');
        const imageElement = friendElement.querySelector('img');
        
        const username = nameElement.textContent;
        const fullName = getFriendNameFromUsername(username);
        const imageSrc = imageElement.getAttribute('src');
        
        addFriendToList(friendId, fullName, imageSrc, buttonElement);
    }

    // Function to update button states on news feed page
    function updateNewsFeedButtonStates() {
        const friends = getFriendsFromStorage();
        // Target buttons specifically within .friend-suggestions on the news feed
        const newsFeedAddButtons = document.querySelectorAll('.newsfeed-container .friend-suggestions .friend-suggestion button[data-friend-id]');

        newsFeedAddButtons.forEach(button => {
            const friendId = parseInt(button.getAttribute('data-friend-id'));
            if (friends.some(friend => friend.id === friendId)) {
                button.textContent = 'Added';
                button.classList.add('added'); // This class comes from friend-connect.css
                button.disabled = true;
            } else {
                button.textContent = 'Add';
                button.classList.remove('added');
                button.disabled = false;
            }
        });
    }
    
    // Function to load friends on the friends page
    function loadFriends() {
        const friendsListContainer = document.getElementById('friendsListContainer');
        if (!friendsListContainer) return; 

        const friends = getFriendsFromStorage();
        friendsListContainer.innerHTML = ''; 
        
        if (friends.length === 0) {
            friendsListContainer.innerHTML = '<p style="text-align: center; color: #8f2d56;">You have no friends yet. Add some from the News Feed or try Friend Suggestions below!</p>';
        } else {
            friends.forEach(friend => {
                const friendCard = document.createElement('div');
                friendCard.className = 'friend-card'; 
                friendCard.innerHTML = `
                    <div class="friend-status ${friend.online ? 'online' : ''}"></div>
                    <img src="${friend.image}" alt="${friend.name}" class="friend-image" onerror="this.src='https://via.placeholder.com/100/CCCCCC/808080?text=Avatar';">
                    <h4 class="friend-name">${friend.name}</h4>
                    <p class="friend-info">Connected since ${friend.connected}</p>
                    <div class="friend-actions">
                        <button class="friend-btn message">Message</button>
                        <button class="friend-btn remove" data-friend-id="${friend.id}">Remove</button>
                    </div>
                `;
                friendsListContainer.appendChild(friendCard);
            });
        }
        updateFriendCount();
        
        const removeButtons = friendsListContainer.querySelectorAll('.friend-btn.remove');
        removeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const friendIdStr = this.getAttribute('data-friend-id');
                const friendIdToRemove = parseInt(friendIdStr);

                if (isNaN(friendIdToRemove)) {
                    console.error("Failed to parse friend ID for removal. Button HTML:", this.outerHTML);
                    return;
                }
                removeFriend(friendIdToRemove);
            });
        });
    }
    
    // Function to remove a friend
    function removeFriend(friendId) {
        let friends = getFriendsFromStorage();
        const friendToRemove = friends.find(friend => friend.id === friendId);
        
        if (friendToRemove) {
            friends = friends.filter(friend => friend.id !== friendId);
            localStorage.setItem('connectHubFriends', JSON.stringify(friends));
            loadFriends(); 
            showNotification(`${friendToRemove.name} has been removed from your friends list.`);
             if (document.querySelectorAll('.newsfeed-container .friend-suggestions .friend-suggestion button[data-friend-id]').length > 0) {
                updateNewsFeedButtonStates();
            }
        } else {
            console.warn(`Attempted to remove friend with ID ${friendId}, but they were not found.`);
        }
    }

    function handleGenerateFriendsClick() {
        const addRandomFriendsSection = document.querySelector('.add-random-friends');
        if (!addRandomFriendsSection) return;

        addRandomFriendsSection.innerHTML = `
            <h3>Friend Suggestions</h3>
            <div class="loading-spinner"><div class="spinner"></div></div>
        `;
        
        setTimeout(() => {
            const suggestionsHTML = generateRandomSuggestionsHTML();
            addRandomFriendsSection.innerHTML = `
                <h3>Friend Suggestions</h3>
                <div class="suggestion-list">${suggestionsHTML}</div>
                <button id="generateFriendsBtn" class="btn primary">Refresh Suggestions</button>
            `;
            
            const newGenerateBtn = document.getElementById('generateFriendsBtn');
            if (newGenerateBtn) {
                newGenerateBtn.addEventListener('click', handleGenerateFriendsClick);
            }
            
            const suggestionAddButtons = addRandomFriendsSection.querySelectorAll('.suggestion-card .friend-btn.add');
            suggestionAddButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const card = this.closest('.suggestion-card');
                    const nameElem = card.querySelector('.suggestion-name');
                    const imgElem = card.querySelector('img');
                    const friendId = this.getAttribute('data-friend-id');
                    addFriendToList(friendId, nameElem.textContent, imgElem.getAttribute('src'), this);
                });
            });
        }, 1500);
    }
    
    function generateRandomSuggestionsHTML() {
        const names = [
            'Aliya Nurmanova', 'Bayan Kenzhebekova', 'Dana Berdibekova', 
            'Zhanar Amirbekova', 'Madina Bazarbayeva', 'Saltanat Ermekova',
            'Arman Dosbolov', 'Timur Serikov', 'Nurlan Akhmetov', 'Aida Zhumagaliyeva'
        ];
        
        const currentFriends = getFriendsFromStorage();
        const currentFriendNames = new Set(currentFriends.map(f => f.name.toLowerCase()));
        const currentFriendIds = new Set(currentFriends.map(f => f.id));
        
        let html = '';
        let nextIdBase = 300; // Using a higher base to avoid collision with news feed IDs
        let suggestionsCount = 0;
        const maxSuggestions = 3;
        const suggestedNamesThisRound = new Set();

        const potentialSuggestions = names.filter(name => !currentFriendNames.has(name.toLowerCase()));
        
        if (potentialSuggestions.length === 0) {
             return "<p style='text-align: center; color: #8f2d56;'>No new suggestions available right now!</p>";
        }

        while(suggestionsCount < maxSuggestions && suggestedNamesThisRound.size < potentialSuggestions.length) {
            let tempId = nextIdBase;
            while(currentFriendIds.has(tempId)){ 
                tempId++;
            }
            let randomName;
            do {
                randomName = potentialSuggestions[Math.floor(Math.random() * potentialSuggestions.length)];
            } while (suggestedNamesThisRound.has(randomName) && suggestedNamesThisRound.size < potentialSuggestions.length);

            if (suggestedNamesThisRound.has(randomName) && suggestedNamesThisRound.size >= potentialSuggestions.length) break;

            suggestedNamesThisRound.add(randomName);
            currentFriendIds.add(tempId); 

            const mutualFriends = Math.floor(Math.random() * 5) + 1;
            const imagePlaceholder = `https://ui-avatars.com/api/?name=${encodeURIComponent(randomName)}&background=random&color=fff&size=100`;

            html += `
                <div class="suggestion-card">
                    <img src="${imagePlaceholder}" alt="${randomName}" class="suggestion-image">
                    <h4 class="suggestion-name">${randomName}</h4>
                    <p class="suggestion-info">${mutualFriends} mutual friends</p>
                    <button class="friend-btn add" data-friend-id="${tempId}">Add Friend</button>
                </div>
            `;
            suggestionsCount++;
            nextIdBase = tempId + 1; 
        }
        
        if (html === '') {
            html = "<p style='text-align: center; color: #8f2d56;'>No new suggestions available right now!</p>";
        }
        return html;
    }

    // --- Event Listeners and Initial Calls ---
    // Check if we are on the news feed page by looking for a unique news feed element
    const newsFeedMainContainer = document.querySelector('.newsfeed-container'); 
    if (newsFeedMainContainer) { 
        updateNewsFeedButtonStates(); 
        // Use a more specific selector for news feed add buttons
        const newsFeedAddButtons = newsFeedMainContainer.querySelectorAll('.friend-suggestions .friend-suggestion button[data-friend-id]');
        newsFeedAddButtons.forEach(button => {
            button.addEventListener('click', function() {
                const friendId = this.getAttribute('data-friend-id');
                addFriendFromNewsFeed(friendId, this);
            });
        });
    }

    // Check if we are on the friends page
    if (document.getElementById('friendsListContainer')) { 
        loadFriends(); 
        const generateFriendsBtn = document.getElementById('generateFriendsBtn');
        if (generateFriendsBtn) {
            generateFriendsBtn.addEventListener('click', handleGenerateFriendsClick);
        }
    }
});