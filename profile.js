// User Profile System - Main JavaScript File (profile.js - FULL FUNCTIONALITY, RELOAD FIX, MEDIA EMPHASIS)

// Global variables
let db;
let currentUser = null; // This script's session indicator
let currentEditingPostId_Profile = null; // For the edit modal on the profile page

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Profile Page DOMContentLoaded");
    initDatabase(); // Initialize DB first
    // createEditPostModal_Profile() should be called after DB init or as part of UI setup that depends on login state
});

// Initialize IndexedDB
function initDatabase() {
    console.log("initDatabase called");
    const request = indexedDB.open('UserProfileDB', 1); // Ensure version number is consistent

    request.onerror = event => {
        console.error("Database error:", event.target.errorCode);
        showNotification('Error connecting to database. Profile features may not work.', 'error');
         // Attempt to show auth section if DB fails, as profile section needs DB
        updateAuthUI(false);
    };

    request.onupgradeneeded = event => {
        console.log("Database onupgradeneeded");
        db = event.target.result;
        if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'email' });
            usersStore.createIndex('username', 'username', { unique: true });
        }
        if (!db.objectStoreNames.contains('posts')) {
            const postsStore = db.createObjectStore('posts', { keyPath: 'id', autoIncrement: true });
            postsStore.createIndex('userEmail', 'userEmail', { unique: false });
            postsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
    };

    request.onsuccess = event => {
        db = event.target.result;
        console.log("Database initialized successfully for profile page");
        // Now that DB is ready, setup UI elements that might depend on it and check session
        setupEventListeners(); // Setup general listeners
        checkForSavedSession(); // Check for session *after* DB is ready
        createEditPostModal_Profile(); // Create modal now
    };
}

// Setup all event listeners
function setupEventListeners() {
    console.log("setupEventListeners called");
    const mediaUpload = document.getElementById('media-upload');
    if (mediaUpload) {
        mediaUpload.addEventListener('change', handleMediaPreview);
    } else {
        console.warn("WARNING: 'media-upload' input element not found in HTML for profile page!");
    }
    
    const musicToggleButton = document.getElementById('music-toggle-button');
    if (musicToggleButton) {
        musicToggleButton.addEventListener('click', toggleSongSelection);
    }

    const songListItems = document.querySelectorAll('#song-selection-container ul li');
    songListItems.forEach(item => {
        item.addEventListener('click', playSelectedSong);
    });
}

// Handle media file preview for uploads
function handleMediaPreview(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const videoPreview = document.getElementById('video-preview');

    if(!previewContainer || !imagePreview || !videoPreview) {
        console.warn("Profile media preview elements not found.");
        return;
    }

    if (!file) {
        previewContainer.classList.add('hidden');
        imagePreview.classList.add('hidden');
        videoPreview.classList.add('hidden');
        imagePreview.src = '#'; 
        videoPreview.src = '#'; 
        return;
    }
    
    previewContainer.classList.remove('hidden');
    if (file.type.startsWith('image/')) {
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.classList.remove('hidden');
        videoPreview.classList.add('hidden');
    } else if (file.type.startsWith('video/')) {
        videoPreview.src = URL.createObjectURL(file);
        videoPreview.classList.remove('hidden');
        imagePreview.classList.add('hidden');
    } else {
        previewContainer.classList.add('hidden');
        showNotification('Unsupported file type for preview. Only images/videos.', 'warning');
        event.target.value = ''; 
    }
}

// Check for saved user session
function checkForSavedSession() {
    console.log("checkForSavedSession called");
    const savedUserJSON = localStorage.getItem('currentUser');
    if (savedUserJSON) {
        console.log("Found saved user in localStorage:", savedUserJSON);
        try {
            const userFromStorage = JSON.parse(savedUserJSON);
            if (db) { // Ensure DB is ready before verification
                verifyUserInDatabase(userFromStorage);
            } else {
                // This case should ideally not happen if called after DB init, but as a fallback:
                console.warn("DB not ready during session check. This might lead to inconsistencies.");
                // Potentially wait for DB or show a loading state
                // For now, showing profile based on LS data, but this is less secure/reliable
                // currentUser = userFromStorage; // Set global currentUser
                // showProfile(currentUser);
                // updateAuthUI(true); // Show profile section based on LS data
                // showNotification("Verifying session...", "info", false); // Let user know
                // We might need a retry mechanism or a global "dbReady" flag/promise
            }
        } catch (e) {
            console.error("Error parsing saved user:", e);
            localStorage.removeItem('currentUser'); currentUser = null; updateAuthUI(false);
        }
    } else {
         console.log("No saved user session found.");
         updateAuthUI(false); // Show login form
    }
}

// Verify user exists in database (called by checkForSavedSession)
function verifyUserInDatabase(userFromStorage) {
    console.log("verifyUserInDatabase called for:", userFromStorage.email);
    if(!db) {
        console.error("verifyUserInDatabase called but DB is not ready. Aborting.");
        // This indicates a logic flow issue, as this function should only be called when db is ready.
        logout(); // Force logout if DB isn't ready for verification.
        return;
    }
    const transaction = db.transaction(['users'], 'readonly');
    const usersStore = transaction.objectStore('users');
    const request = usersStore.get(userFromStorage.email);

    request.onsuccess = event => {
        const dbUser = event.target.result;
        if (dbUser && dbUser.password === userFromStorage.password) { // Basic check
            console.log("User verified in DB:", dbUser.username);
            currentUser = dbUser; // Set the global currentUser to the one from DB
            // No need to set localStorage again here if it was just read, unless dbUser has more/updated info.
            // For simplicity, let's assume userFromStorage is sufficient for what was stored.
            // Or, re-set with dbUser if it's considered more authoritative:
            // localStorage.setItem('currentUser', JSON.stringify(dbUser));

            showProfile(currentUser);
            loadUserPosts(currentUser.email); 
            updateAuthUI(true); // Show profile, hide auth
        } else {
            console.warn("User from localStorage not found in DB or password mismatch. Logging out.");
            logout(); // This calls updateAuthUI(false)
            showNotification('Session invalid or expired. Please login again.', 'warning');
        }
    };
    request.onerror = (e) => {
        console.error("Error verifying user in DB:", e.target.error);
        logout(); // This calls updateAuthUI(false)
        showNotification('Error verifying your session. Please try logging in.', 'error');
    };
}

// Toggle between login and register forms
function toggleForms() {
    console.log("toggleForms called");
    document.getElementById('login-form').classList.toggle('hidden');
    document.getElementById('register-form').classList.toggle('hidden');
}

// User Registration
function registerUser() {
    console.log("registerUser attempt");
    if (!db) { showNotification("Database not ready. Please wait and try again.", "error"); return; }

    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const age = parseInt(document.getElementById('reg-age').value);
    if (!username || !email || !password || isNaN(age) || username.length < 3 || !isValidEmail(email) || password.length < 6 || age < 13 || age > 120) {
        showNotification('Invalid registration details. Check all fields (Username >2 chars, valid email, Password >5 chars, Age 13-120).', 'error'); return;
    }
    const userData = { username, email, password, age, dateJoined: new Date().toISOString() };
    const transaction = db.transaction(['users'], 'readwrite');
    const usersStore = transaction.objectStore('users');
    const request = usersStore.add(userData);
    request.onsuccess = () => {
        showNotification('Registration successful! Please login.', 'success');
        toggleForms(); // Switch to login form
        const regForm = document.getElementById('register-form');
        if(regForm && typeof regForm.reset === 'function') regForm.reset(); // Reset registration form
    };
    request.onerror = (e) => {
        console.error("Registration error:", e.target.error);
        if (e.target.error.name === 'ConstraintError') {
            showNotification('Registration failed. Email or username already exists.', 'error');
        } else {
            showNotification('Registration failed. Please try again.', 'error');
        }
    };
}

// User Login
function loginUser() {
    console.log("loginUser attempt");
    if (!db) { showNotification("Database not ready. Please wait and try again.", "error"); return; }

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showNotification('Email and Password are required.', 'error'); return; }
    
    const transaction = db.transaction(['users'], 'readonly');
    const usersStore = transaction.objectStore('users');
    const request = usersStore.get(email);
    
    request.onsuccess = event => {
        const userFromDB = event.target.result;
        if (userFromDB && userFromDB.password === password) { // STILL INSECURE, for demo only
            console.log("Login successful for:", userFromDB.username);
            currentUser = userFromDB; // Set global currentUser
            localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Save session
            localStorage.setItem('userName', currentUser.username); // For news_feed.js
            localStorage.setItem('userProfilePic', 'images/u.jpg'); // Default or fetch saved
            
            showProfile(currentUser);
            loadUserPosts(currentUser.email); 
            updateAuthUI(true); // Show profile, hide auth           

            showNotification(`Welcome back, ${currentUser.username}!`, 'success');
            const loginForm = document.getElementById('login-form');
            if(loginForm && typeof loginForm.reset === 'function') loginForm.reset();
        } else {
            console.warn("Login failed: Invalid email or password.");
            showNotification('Invalid email or password.', 'error');
        }
    };
    request.onerror = (e) => {
        console.error("Login DB error:", e.target.error);
        showNotification('Login failed due to a database error. Please try again.', 'error');
    };
}

// Display user profile information
function showProfile(user) {
    console.log("showProfile called for:", user.username);
    const usernameEl = document.getElementById('profile-username');
    const emailEl = document.getElementById('profile-email');
    const ageEl = document.getElementById('profile-age');
    if(usernameEl) usernameEl.textContent = user.username;
    if(emailEl) emailEl.textContent = user.email;
    if(ageEl) ageEl.textContent = user.age;
}

function updateAuthUI(isLoggedIn) {
    console.log("updateAuthUI called, isLoggedIn:", isLoggedIn);
    const authSection = document.getElementById('auth-section');
    const profileSection = document.getElementById('profile-section');
    if(authSection) authSection.classList.toggle('hidden', isLoggedIn);
    if(profileSection) profileSection.classList.toggle('hidden', !isLoggedIn);

    if (!isLoggedIn) {
        // Reset music section if logging out
        const songSelectionContainer = document.getElementById('song-selection-container');
        const spotifyPlayerContainer = document.getElementById('spotify-player-container');
        const musicToggleButton = document.getElementById('music-toggle-button');

        if (songSelectionContainer) songSelectionContainer.classList.add('hidden');
        if (spotifyPlayerContainer) {
            spotifyPlayerContainer.classList.add('hidden');
            const spotifyPlayer = document.getElementById('spotify-embed-player');
            if (spotifyPlayer) spotifyPlayer.src = '';
        }
        if (musicToggleButton) musicToggleButton.innerHTML = '<i class="fas fa-music"></i> My Favorite Songs';
    }
}

// Logout function
function logout() {
    console.log("logout called");
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userName'); 
    localStorage.removeItem('userProfilePic'); // Clear profile pic if you stored it
    currentUser = null;
    updateAuthUI(false); 
    const postsContainer = document.getElementById('posts-container');
    if (postsContainer) postsContainer.innerHTML = ''; // Clear posts from profile page
    showNotification('You have been logged out.', 'info');
}

// --- SYNC HELPER for LocalStorage (for news_feed.js) ---
// (This function remains the same as your provided one)
function syncPostWithNewsFeedLocalStorage(postDataForNewsFeed, action = 'add') {
    let newsFeedPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
    const existingIndex = newsFeedPosts.findIndex(p => String(p.id) === String(postDataForNewsFeed.id));
    if (action === 'add' || action === 'update') {
        if (existingIndex > -1) newsFeedPosts[existingIndex] = { ...newsFeedPosts[existingIndex], ...postDataForNewsFeed };
        else newsFeedPosts.unshift(postDataForNewsFeed); // Add new posts to the beginning
    } else if (action === 'delete' && existingIndex > -1) {
        newsFeedPosts.splice(existingIndex, 1);
    }
    localStorage.setItem('userPosts', JSON.stringify(newsFeedPosts));
}


// Create a new post (for the profile page)
function createPost() {
    console.log("createPost attempt");
    if (!currentUser) { showNotification('You must be logged in to create a post.', 'error'); return; }
    if (!db) { showNotification("Database not ready. Cannot create post.", "error"); return; }
    
    const contentElement = document.getElementById('post-content');
    const mediaUploadElement = document.getElementById('media-upload');

    if (!contentElement || !mediaUploadElement) {
        showNotification("Post form elements are missing from the page. Check HTML.", "error"); return;
    }

    const content = contentElement.value.trim();
    const mediaFile = mediaUploadElement.files && mediaUploadElement.files.length > 0 ? mediaUploadElement.files[0] : null;

    if (!content && !mediaFile) {
        showNotification('A post needs either text content or an uploaded media file.', 'error'); return;
    }
    
    const pendingNotification = showNotification('Creating your post...', 'info', false); // Don't auto-hide this one
    
    const newsFeedUserName = localStorage.getItem('userName') || currentUser.username;
    const newsFeedUserProfilePic = localStorage.getItem('userProfilePic') || 'images/u.jpg';

    function savePostToDB(mediaDataUrl = null, mediaType = null) {
        const postDataDB = {
            userEmail: currentUser.email, username: currentUser.username, content: content,
            createdAt: new Date().toISOString(),
            media: mediaDataUrl, mediaType: mediaType, // mediaType will be 'image' or 'video' or null
            likes: 0, comments: [] // Initialize likes and comments
        };
        
        console.log("Attempting to save post to DB:", {content: postDataDB.content, mediaType: postDataDB.mediaType, mediaUrlPresent: !!postDataDB.media});

        const transaction = db.transaction(['posts'], 'readwrite');
        const postsStore = transaction.objectStore('posts');
        const request = postsStore.add(postDataDB); // Add new post to DB
        
        request.onsuccess = (event) => {
            if (pendingNotification && pendingNotification.parentNode) pendingNotification.parentNode.removeChild(pendingNotification); // Remove pending
            const postIdFromDB = event.target.result; // This is the auto-incremented ID
            showNotification('Post created successfully!', 'success');
            
            contentElement.value = ''; 
            mediaUploadElement.value = ''; // Clear file input
            
            const previewContainer = document.getElementById('preview-container');
            if(previewContainer) {
                 previewContainer.classList.add('hidden');
                 const imgPreview = document.getElementById('image-preview');
                 const vidPreview = document.getElementById('video-preview');
                 if(imgPreview) imgPreview.src = '#'; 
                 if(vidPreview) vidPreview.src = '#';
            }

            // Prepare data for news_feed.js localStorage sync
            const postDataForNewsFeed = {
                id: 'post-' + postIdFromDB, // Prefix to avoid pure number ID issues if news_feed expects strings
                text: content, 
                timestamp: postDataDB.createdAt,
                media: mediaDataUrl ? { type: mediaType === 'image' ? 'photo' : 'video', url: mediaDataUrl } : null,
                likeCount: 0, 
                liked: false, 
                comments: [],
                userName: newsFeedUserName,       // Use consistent username
                userProfilePic: newsFeedUserProfilePic // Use consistent profile pic
            };
            syncPostWithNewsFeedLocalStorage(postDataForNewsFeed, 'add');
            loadUserPosts(currentUser.email); // Reload posts on profile page
        };
        request.onerror = (e) => {
            if (pendingNotification && pendingNotification.parentNode) pendingNotification.parentNode.removeChild(pendingNotification);
            console.error("Error saving post to DB:", e.target.error);
            showNotification('Failed to create the post in the database.', 'error');
        };
    }

    if (mediaFile) {
        console.log("Processing media file:", mediaFile.name, mediaFile.type);
        if (mediaFile.size > 15 * 1024 * 1024) { // 15MB limit
            if (pendingNotification && pendingNotification.parentNode) pendingNotification.parentNode.removeChild(pendingNotification);
            showNotification('The selected file is too large (max 15MB). Please choose a smaller file.', 'error');
            mediaUploadElement.value = ''; 
            const previewContainer = document.getElementById('preview-container');
            if(previewContainer) previewContainer.classList.add('hidden');
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            console.log("FileReader successfully read the media file. Data URL created.");
            const detectedMediaType = mediaFile.type.startsWith('image/') ? 'image' : (mediaFile.type.startsWith('video/') ? 'video' : null);
            if (detectedMediaType) {
                savePostToDB(e.target.result, detectedMediaType);
            } else {
                if (pendingNotification && pendingNotification.parentNode) pendingNotification.parentNode.removeChild(pendingNotification);
                showNotification('Unsupported media file type. Only images (e.g., jpg, png, gif) and videos (e.g., mp4, webm) are allowed.', 'error');
                mediaUploadElement.value = '';
                const previewContainer = document.getElementById('preview-container');
                if(previewContainer) previewContainer.classList.add('hidden');
            }
        };
        reader.onerror = (e) => {
            if (pendingNotification && pendingNotification.parentNode) pendingNotification.parentNode.removeChild(pendingNotification);
            console.error("FileReader error while reading media file:", e);
            showNotification('There was an error reading the selected file. Please try again or choose a different file.', 'error');
            mediaUploadElement.value = '';
            const previewContainer = document.getElementById('preview-container');
            if(previewContainer) previewContainer.classList.add('hidden');
        };
        reader.readAsDataURL(mediaFile); // Read the file as a Data URL
    } else {
        console.log("No media file selected, creating a text-only post.");
        savePostToDB(null, null); // No media URL, no media type
    }
}

// --- Load, Create Element, Like, Comment, Edit, Delete for PROFILE PAGE POSTS ---
// (These functions: loadUserPosts, createPostElement, likePost_ProfilePage, etc.
//  remain largely the same as your provided ones, with minor logging or safety checks if needed)
//  Make sure they correctly use `currentUser` and `db`.

// Load user posts AND DISPLAY THEM ON THE PROFILE PAGE
function loadUserPosts(userEmail) {
    console.log("loadUserPosts called for:", userEmail);
    if (!db) { console.error("loadUserPosts: DB not ready."); return; }
    const postsContainer = document.getElementById('posts-container');
    if(!postsContainer) { console.error("Profile 'posts-container' not found!"); return; }
    
    postsContainer.innerHTML = '<p>Loading your posts...</p>'; // Placeholder
    
    const transaction = db.transaction(['posts'], 'readonly');
    const postsStore = transaction.objectStore('posts');
    const userEmailIndex = postsStore.index('userEmail'); // Ensure this index exists
    const request = userEmailIndex.getAll(userEmail); // Get all posts by this user

    request.onsuccess = event => {
        postsContainer.innerHTML = ''; // Clear placeholder or old posts
        const posts = event.target.result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort newest first
        console.log(`Found ${posts.length} posts for ${userEmail}`);
        if (posts.length === 0) { 
            postsContainer.innerHTML = '<p>You haven\'t created any posts yet. Create one above!</p>'; 
            return; 
        }
        posts.forEach(post => postsContainer.appendChild(createPostElement(post)));
    };
    request.onerror = (e) => { 
        postsContainer.innerHTML = '<p>Failed to load your posts. Please try refreshing.</p>'; 
        console.error("Error loading posts:", e.target.error); 
    };
}

// Create post DOM element (for profile page)
function createPostElement(post) {
    // This function structure from your code is good. Ensure all dataset.postId are correct.
    const postElement = document.createElement('div');
    postElement.className = 'post profile-post-card'; // Added a more specific class
    postElement.dataset.postId = post.id; // Use the DB's auto-incremented ID

    const postHeader = document.createElement('div');
    postHeader.className = 'post-header';
    const postAuthor = document.createElement('h4');
    postAuthor.textContent = post.username; // Username from the post data
    const postTimestamp = document.createElement('span');
    postTimestamp.className = 'post-timestamp';
    postTimestamp.textContent = formatDate(post.createdAt);
    postHeader.appendChild(postAuthor);
    postHeader.appendChild(postTimestamp);

    const postContentDiv = document.createElement('div');
    postContentDiv.className = 'post-content';
    if (post.content) {
        const contentParagraph = document.createElement('p');
        contentParagraph.innerHTML = post.content.replace(/\n/g, '<br>'); // Handle newlines
        postContentDiv.appendChild(contentParagraph);
    }

    postElement.appendChild(postHeader);
    postElement.appendChild(postContentDiv);

    if (post.media && post.mediaType) {
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'post-media-container'; // For styling wrapper if needed
        if (post.mediaType === 'image') {
            const img = document.createElement('img');
            img.src = post.media; img.className = 'post-media'; img.alt = 'Post image';
            mediaContainer.appendChild(img);
        } else if (post.mediaType === 'video') {
            const video = document.createElement('video');
            video.src = post.media; video.className = 'post-media'; video.controls = true;
            mediaContainer.appendChild(video);
        }
        postElement.appendChild(mediaContainer);
    }
    
    const postActions = document.createElement('div');
    postActions.className = 'post-actions';
    
    const likeButton = document.createElement('button');
    likeButton.className = 'action-button like-button-profile';
    likeButton.innerHTML = `<i class="fas fa-thumbs-up"></i> Like ${post.likes > 0 ? `(${post.likes})` : ''}`;
    likeButton.onclick = () => likePost_ProfilePage(post.id);
    
    const commentButton = document.createElement('button');
    commentButton.className = 'action-button comment-button-profile';
    const commentCount = post.comments ? post.comments.length : 0;
    commentButton.innerHTML = `<i class="fas fa-comment"></i> Comment ${commentCount > 0 ? `(${commentCount})` : ''}`;
    commentButton.onclick = () => toggleCommentSection_ProfilePage(post.id);
    
    const editButton = document.createElement('button');
    editButton.className = 'action-button edit-button-profile';
    editButton.innerHTML = `<i class="fas fa-edit"></i> Edit`;
    editButton.onclick = () => openEditModal_Profile(post.id);
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'action-button delete-button-profile';
    deleteButton.innerHTML = `<i class="fas fa-trash"></i> Delete`;
    deleteButton.onclick = () => deletePost(post.id); // Ensure deletePost uses the DB ID
    
    postActions.appendChild(likeButton);
    postActions.appendChild(commentButton);
    postActions.appendChild(editButton);
    postActions.appendChild(deleteButton);
    postElement.appendChild(postActions);

    // Comment Section (initially hidden, specific to profile page posts)
    const commentSectionDiv = document.createElement('div');
    commentSectionDiv.className = 'profile-post-comment-section'; // Specific class
    commentSectionDiv.style.display = 'none'; 
    commentSectionDiv.innerHTML = `
        <div class="profile-post-comments-list"></div>
        <div class="profile-post-comment-input-area">
            <textarea class="profile-post-comment-text-input" placeholder="Write a comment..."></textarea>
            <button class="profile-post-comment-submit-btn action-button primary">Post Comment</button>
        </div>`;
    postElement.appendChild(commentSectionDiv);

    const commentSubmitBtn = commentSectionDiv.querySelector('.profile-post-comment-submit-btn');
    if(commentSubmitBtn) {
        commentSubmitBtn.addEventListener('click', () => submitComment_ProfilePage(post.id, commentSectionDiv));
    }
    return postElement;
}

// --- Music Feature Functions --- (remain the same)
function toggleSongSelection() {
    const songSelectionContainer = document.getElementById('song-selection-container');
    const spotifyPlayerContainer = document.getElementById('spotify-player-container');
    const musicToggleButton = document.getElementById('music-toggle-button');

    if (songSelectionContainer && spotifyPlayerContainer && musicToggleButton) {
        songSelectionContainer.classList.toggle('hidden');
        const isHidden = songSelectionContainer.classList.contains('hidden');
        
        musicToggleButton.innerHTML = isHidden ? 
            '<i class="fas fa-music"></i> My Favorite Songs' : 
            '<i class="fas fa-chevron-down"></i> Hide Songs';

        if (isHidden) { // If hiding song selection, also hide player
            spotifyPlayerContainer.classList.add('hidden');
            const spotifyPlayer = document.getElementById('spotify-embed-player');
            if (spotifyPlayer) spotifyPlayer.src = ''; // Stop music
        }
    }
}

function playSelectedSong(event) {
    const songId = event.currentTarget.dataset.songId;
    const spotifyPlayer = document.getElementById('spotify-embed-player');
    const spotifyPlayerContainer = document.getElementById('spotify-player-container');

    if (songId && spotifyPlayer && spotifyPlayerContainer) {
        const embedUrl = `https://open.spotify.com/embed/track/${songId}?utm_source=generator&theme=0`;
        spotifyPlayer.src = embedUrl;
        spotifyPlayerContainer.classList.remove('hidden');
    } else {
        console.error("Could not play song. Player element, container, or songId missing.");
        showNotification("Error: Could not load the song player.", "error");
    }
}


// --- Like, Comment, Edit, Delete FOR PROFILE PAGE POSTS ---
// (These functions remain largely the same, ensure they use `currentUser` and `db` correctly)
function likePost_ProfilePage(postId) {
    if (!currentUser || !db) { showNotification('You must be logged in to like posts.', 'error'); return; }
    const transaction = db.transaction(['posts'], 'readwrite');
    const postsStore = transaction.objectStore('posts');
    const request = postsStore.get(postId);

    request.onsuccess = event => {
        const post = event.target.result;
        if (post) {
            // Basic like toggle: if you implement a "who liked" list, this would be more complex
            post.likes = (post.likes || 0) + 1; // Simple increment for demo
            const updateRequest = postsStore.put(post);
            updateRequest.onsuccess = () => {
                const postCard = document.querySelector(`.profile-post-card[data-post-id="${postId}"]`);
                if(postCard) {
                    const likeBtn = postCard.querySelector('.like-button-profile');
                    if(likeBtn) likeBtn.innerHTML = `<i class="fas fa-thumbs-up"></i> Like (${post.likes})`;
                }
                // Also sync this like count to news_feed.js localStorage if desired
            };
            updateRequest.onerror = () => showNotification('Failed to update like.', 'error');
        }
    };
    request.onerror = () => showNotification('Could not find post to like.', 'error');
}

function toggleCommentSection_ProfilePage(postId) {
    const postCard = document.querySelector(`.profile-post-card[data-post-id="${postId}"]`);
    if (!postCard) return;
    const commentSection = postCard.querySelector('.profile-post-comment-section');
    if (!commentSection) return;

    const isHidden = commentSection.style.display === 'none' || !commentSection.style.display;
    commentSection.style.display = isHidden ? 'block' : 'none';
    if (isHidden) { // If showing section
        const textarea = commentSection.querySelector('.profile-post-comment-text-input');
        if(textarea) textarea.focus();
        renderComments_ProfilePage(postId, commentSection.querySelector('.profile-post-comments-list'));
    }
}

function submitComment_ProfilePage(postId, commentSectionDiv) {
    if (!currentUser || !db) { showNotification('You must be logged in to comment.', 'error'); return; }
    
    const textarea = commentSectionDiv.querySelector('.profile-post-comment-text-input');
    if (!textarea) { console.error("Comment textarea not found in commentSectionDiv"); return; }
    
    const text = textarea.value.trim();
    if (text === '') { showNotification("Comment cannot be empty.", "warning"); return; }

    const commentData = {
        id: 'comment-profile-' + Date.now() + Math.random().toString(36).substr(2, 5), // More unique ID
        authorUsername: currentUser.username,
        authorEmail: currentUser.email, 
        text: text,
        timestamp: new Date().toISOString()
        // likes for comments could be added here too
    };

    const transaction = db.transaction(['posts'], 'readwrite');
    const store = transaction.objectStore('posts');
    const request = store.get(postId);

    request.onsuccess = () => {
        const post = request.result;
        if (post) {
            if (!post.comments) post.comments = [];
            post.comments.push(commentData);
            const updateRequest = store.put(post);

            updateRequest.onsuccess = () => {
                showNotification('Comment added!', 'success');
                textarea.value = ''; // Clear textarea
                const commentsListDiv = commentSectionDiv.querySelector('.profile-post-comments-list');
                if (commentsListDiv) renderComments_ProfilePage(postId, commentsListDiv); // Re-render comments for this post
                
                // Update comment count on the main button
                const postCard = document.querySelector(`.profile-post-card[data-post-id="${postId}"]`);
                if(postCard) {
                    const commentBtn = postCard.querySelector('.comment-button-profile');
                    if(commentBtn) commentBtn.innerHTML = `<i class="fas fa-comment"></i> Comment (${post.comments.length})`;
                }
                // Also sync this comment to news_feed.js localStorage if desired
            };
            updateRequest.onerror = () => showNotification('Failed to save your comment.', 'error');
        } else {
            showNotification('Could not find the post to add a comment to.', 'error');
        }
    };
    request.onerror = () => showNotification('Error fetching post for commenting.', 'error');
}

function renderComments_ProfilePage(postId, commentsListContainer) {
    if (!db || !commentsListContainer) {
        console.error("Render comments: DB or container missing.", db, commentsListContainer);
        return;
    }
    commentsListContainer.innerHTML = ''; // Clear existing comments

    const transaction = db.transaction(['posts'], 'readonly');
    const store = transaction.objectStore('posts');
    const request = store.get(postId);

    request.onsuccess = () => {
        const post = request.result;
        if (post && post.comments && post.comments.length > 0) {
            const sortedComments = post.comments.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)); // Oldest first
            sortedComments.forEach(comment => {
                commentsListContainer.appendChild(createCommentElement_ProfilePage(comment));
            });
        } else {
            commentsListContainer.innerHTML = '<p><i>No comments yet. Be the first to comment!</i></p>';
        }
    };
    request.onerror = () => {
        commentsListContainer.innerHTML = '<p><i>Could not load comments at this time.</i></p>';
    }
}

function createCommentElement_ProfilePage(comment) {
    // This structure from your code is good.
    const commentElement = document.createElement('div');
    commentElement.className = 'profile-post-comment-item'; 
    commentElement.dataset.commentId = comment.id; // Use the comment's own ID
    commentElement.innerHTML = `
        <div class="profile-post-comment-content">
            <strong>${comment.authorUsername}</strong>
            <p>${comment.text.replace(/\n/g, '<br>')}</p>
            <small class="profile-post-comment-time">${formatDate(comment.timestamp)}</small>
        </div>
        <!-- Future: Add like/reply buttons for comments here -->
    `;
    return commentElement;
}

// --- Edit Post Modal and Functionality (For Profile Page) ---
function createEditPostModal_Profile() {
    // This function structure from your code is good.
    // Ensure all element IDs are unique if you have other modals.
    const modalId = 'profilePageEditPostModal';
    if (document.getElementById(modalId)) return; // Modal already exists

    const modalHTML = `
        <div id="${modalId}" class="edit-post-modal">
            <div class="edit-post-modal-content">
                <span class="profile-page-edit-modal-close">×</span>
                <h3>Edit Your Post</h3>
                <textarea id="profilePageEditPostTextarea" rows="5" placeholder="Your post content..."></textarea>
                <div id="profilePageEditPostMediaPreview" class="media-preview-edit">
                    <!-- Current media will be shown here -->
                </div>
                <button id="profilePageSaveEditPostBtn" class="action-btn primary">Save Changes</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add specific styles if not already covered globally
    const style = document.getElementById('edit-modal-styles-profile');
    if(!style) { // Check if style element already exists
        const newStyle = document.createElement('style');
        newStyle.id = 'edit-modal-styles-profile'; // Give it an ID
        newStyle.textContent = `
            .edit-post-modal { display:none; position: fixed; z-index: 1050; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); align-items: center; justify-content: center; }
            .edit-post-modal-content { background-color: white; padding: 25px; border-radius: 8px; width: 90%; max-width: 550px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); position: relative; }
            .profile-page-edit-modal-close { position: absolute; top: 10px; right: 15px; font-size: 28px; font-weight: bold; cursor: pointer; color: #aaa; }
            .profile-page-edit-modal-close:hover { color: #333; }
            #profilePageEditPostTextarea { width: calc(100% - 22px); margin-bottom: 15px; padding: 10px; border-radius: 5px; border: 1px solid #ccc; min-height: 80px; font-size: 1rem; }
            .media-preview-edit img, .media-preview-edit video { max-width: 100%; max-height: 200px; display: block; margin: 0 auto 15px auto; border-radius: 5px; border: 1px solid #eee;}
            #profilePageSaveEditPostBtn { width: auto; padding: 10px 20px; background-color: #c23c6f; color:white; } /* Ensure button styling */
            #profilePageSaveEditPostBtn:hover { background-color: #d64c7f; }
        `;
        document.head.appendChild(newStyle);
    }

    const modalElement = document.getElementById(modalId);
    const closeButton = modalElement.querySelector('.profile-page-edit-modal-close');
    const saveButton = document.getElementById('profilePageSaveEditPostBtn');
    
    if (closeButton) closeButton.onclick = () => modalElement.style.display = 'none';
    if (saveButton) saveButton.addEventListener('click', saveEditedPost_Profile);
    
    window.addEventListener('click', (event) => {
        if (event.target == modalElement) {
            modalElement.style.display = 'none';
        }
    });
}

function openEditModal_Profile(postId) {
    if (!db) { showNotification("Database not ready.", "error"); return; }
    currentEditingPostId_Profile = postId; // Store the ID of the post being edited
    const transaction = db.transaction(['posts'], 'readonly');
    const store = transaction.objectStore('posts');
    const request = store.get(postId);

    request.onsuccess = () => {
        const post = request.result;
        if (!post) { showNotification('Post not found for editing.', 'error'); return; }
        
        const textarea = document.getElementById('profilePageEditPostTextarea');
        if (textarea) textarea.value = post.content || '';
        
        const mediaPreviewDiv = document.getElementById('profilePageEditPostMediaPreview');
        if (mediaPreviewDiv) {
            mediaPreviewDiv.innerHTML = ''; // Clear previous preview
            if (post.media && post.mediaType === 'image') {
                mediaPreviewDiv.innerHTML = `<img src="${post.media}" alt="Current media">`;
            } else if (post.media && post.mediaType === 'video') {
                mediaPreviewDiv.innerHTML = `<video src="${post.media}" controls></video>`;
            }
        }
        const modal = document.getElementById('profilePageEditPostModal');
        if (modal) modal.style.display = 'flex'; // Show the modal
    };
    request.onerror = () => showNotification('Error fetching post for editing.', 'error');
}

function saveEditedPost_Profile() {
    if (currentEditingPostId_Profile === null || !db) {
        showNotification("Cannot save. No post selected for editing or DB error.", "error");
        return;
    }
    
    const newTextElement = document.getElementById('profilePageEditPostTextarea');
    if(!newTextElement) {
        showNotification("Error: Edit textarea not found.", "error");
        return;
    }
    const newText = newTextElement.value.trim(); // Get new content
    // Note: This version doesn't allow changing media, only text.
    // If media change is needed, you'd add a file input to the modal.

    const transaction = db.transaction(['posts'], 'readwrite');
    const store = transaction.objectStore('posts');
    const request = store.get(currentEditingPostId_Profile);

    request.onsuccess = () => {
        const post = request.result;
        if (post) {
            post.content = newText; // Update content
            post.lastEditedAt = new Date().toISOString(); // Add/update last edited timestamp
            
            const updateRequest = store.put(post); // Save updated post back to DB
            updateRequest.onsuccess = () => {
                showNotification('Post updated successfully!', 'success');
                const modal = document.getElementById('profilePageEditPostModal');
                if (modal) modal.style.display = 'none'; // Close modal
                
                // Sync with news_feed.js localStorage
                const newsFeedUserName = localStorage.getItem('userName') || post.username;
                const newsFeedUserProfilePic = localStorage.getItem('userProfilePic') || 'images/u.jpg'; // Default or dynamic
                const postDataForNewsFeed = {
                    id: 'post-' + post.id, // Match news_feed.js ID format
                    text: post.content, 
                    timestamp: post.createdAt, // Keep original timestamp, or use lastEditedAt if preferred for sorting
                    media: post.media ? { type: post.mediaType === 'image' ? 'photo' : 'video', url: post.media } : null,
                    // likeCount, liked, comments would ideally be fetched/updated from DB too for consistency
                    userName: newsFeedUserName, 
                    userProfilePic: newsFeedUserProfilePic
                };
                syncPostWithNewsFeedLocalStorage(postDataForNewsFeed, 'update');
                
                if (currentUser) loadUserPosts(currentUser.email); // Reload posts on profile page
                currentEditingPostId_Profile = null; // Reset editing ID
            };
            updateRequest.onerror = () => showNotification('Failed to save the edited post.', 'error');
        } else {
            showNotification('Could not find the post to update.', 'error');
        }
    };
    request.onerror = () => showNotification('Error retrieving post for saving edits.', 'error');
}


// Delete a post (from profile page)
function deletePost(postId) {
    if (!currentUser || !db) { showNotification('You must be logged in to delete posts.', 'error'); return; }
    if (confirm('Are you sure you want to permanently delete this post? This action cannot be undone.')) {
        const transaction = db.transaction(['posts'], 'readwrite');
        const postsStore = transaction.objectStore('posts');
        const request = postsStore.delete(postId); // Delete by DB ID
        request.onsuccess = () => {
            showNotification('Post deleted successfully!', 'success');
            syncPostWithNewsFeedLocalStorage({ id: 'post-' + postId }, 'delete'); // Sync deletion
            if (currentUser) loadUserPosts(currentUser.email); // Reload posts on profile page
        };
        request.onerror = () => showNotification('Failed to delete the post from the database.', 'error');
    }
}


// Utility Functions (formatDate, isValidEmail, showNotification - remain the same)
function formatDate(dateString) {
    if (!dateString) return 'Some time ago';
    const date = new Date(dateString); const now = new Date(); const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSeconds / 60); const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 5) return 'Just now';
    if (diffMins < 1) return `${diffSeconds}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'});
}
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
function showNotification(message, type = 'info', autoHide = true) {
    let nc = document.getElementById('notification-container');
    if (!nc) {
        nc = document.createElement('div'); nc.id = 'notification-container';
        nc.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 1080; display: flex; flex-direction: column; align-items: flex-end; gap: 10px;';
        document.body.appendChild(nc);
    }
    const n = document.createElement('div');
    n.className = `notification type-${type}`; n.textContent = message;
    n.style.cssText = 'padding: 12px 20px; border-radius: 5px; box-shadow: 0 3px 8px rgba(0,0,0,0.2); color: white; opacity:0; transform: translateY(20px); transition: opacity .3s ease, transform .3s ease; min-width: 250px; text-align: left;';
    
    if(type === 'success') n.style.backgroundColor = '#4CAF50'; // Green
    else if(type === 'error') n.style.backgroundColor = '#F44336'; // Red
    else if(type === 'warning') n.style.backgroundColor = '#FF9800'; // Orange
    else n.style.backgroundColor = '#2196F3'; // Blue (info)
    
    nc.appendChild(n);
    
    setTimeout(() => { n.style.opacity = '1'; n.style.transform = 'translateY(0)'; }, 10);
    
    if (autoHide) {
        setTimeout(() => {
            n.style.opacity = '0'; n.style.transform = 'translateY(20px)';
            setTimeout(() => { 
                if(n.parentNode === nc) nc.removeChild(n); 
                // Optional: remove container if empty, but might cause flicker if new notif comes fast
                // if(nc.children.length === 0 && nc.parentNode) nc.parentNode.removeChild(nc);
            }, 300); // Wait for transition to finish
        }, 3000); // Notification visible for 3 seconds
    }
    return n; // Return the notification element if manual close is needed
}