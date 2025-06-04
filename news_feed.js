document.addEventListener('DOMContentLoaded', function() {
    const postButton = document.getElementById('post-button');
    const postText = document.getElementById('post-text');
    const postsContainer = document.getElementById('posts-container');
    
    const memoryStorage = {
        profilePic: localStorage.getItem('userProfilePic') || "images/u.jpg", // Default if nothing in LS
        posts: JSON.parse(localStorage.getItem('userPosts') || '[]'),
        userName: localStorage.getItem('userName') || "Dilnaz Kairatovna",
        
        saveProfilePic: function(picUrl) {
            this.profilePic = picUrl;
            localStorage.setItem('userProfilePic', picUrl);
        },
        
        savePosts: function() {
            localStorage.setItem('userPosts', JSON.stringify(this.posts));
        },
        
        saveUserName: function(name) {
            this.userName = name;
            localStorage.setItem('userName', name);
        },
        
        addPost: function(postData) {
            this.posts.unshift(postData);
            this.savePosts();
            return postData.id;
        },
        
        updatePost: function(postId, updatedData) {
            const postIndex = this.posts.findIndex(post => post.id === postId);
            if (postIndex !== -1) {
                this.posts[postIndex] = {...this.posts[postIndex], ...updatedData};
                this.savePosts();
                return true;
            }
            return false;
        },
        
        deletePost: function(postId) {
            const postIndex = this.posts.findIndex(post => post.id === postId);
            if (postIndex !== -1) {
                this.posts.splice(postIndex, 1);
                this.savePosts();
                return true;
            }
            return false;
        },
        addComment: function(postId, commentData) {
            const postIndex = this.posts.findIndex(post => post.id === postId);
            if (postIndex !== -1) {
                if (!this.posts[postIndex].comments) {
                    this.posts[postIndex].comments = [];
                }
                this.posts[postIndex].comments.push(commentData);
                this.savePosts();
                return commentData.id;
            }
            return null;
        },
        togglePostLike: function(postId) {
            const postIndex = this.posts.findIndex(post => post.id === postId);
            if (postIndex !== -1) {
                const post = this.posts[postIndex];
                post.liked = !post.liked;
                post.likeCount = post.liked ? (post.likeCount || 0) + 1 : (post.likeCount || 1) - 1;
                if (post.likeCount < 0) post.likeCount = 0; // Ensure like count doesn't go negative
                this.savePosts();
                return { liked: post.liked, likeCount: post.likeCount };
            }
            return null;
        },
        
        toggleCommentLike: function(postId, commentId) {
            const postIndex = this.posts.findIndex(post => post.id === postId);
            if (postIndex !== -1 && this.posts[postIndex].comments) {
                const commentIndex = this.posts[postIndex].comments.findIndex(comment => comment.id === commentId);
                if (commentIndex !== -1) {
                    const comment = this.posts[postIndex].comments[commentIndex];
                    comment.liked = !comment.liked;
                    this.savePosts();
                    return comment.liked;
                }
            }
            return null;
        },
        
        clearAll: function() {
            localStorage.removeItem('userProfilePic');
            localStorage.removeItem('userPosts');
            localStorage.removeItem('userName');
            this.profilePic = "images/u.jpg";
            this.posts = [];
            this.userName = "Dilnaz Kairatovna";
        }
    };
    
    let userProfilePic = memoryStorage.profilePic;
    
    let mediaToUpload = {
        type: null,
        url: null
    };
    
    setupProfilePicChanger(userProfilePic);
    loadSavedPosts();
    initializeExistingPosts(); // This might not do much if no static posts in HTML
    setupMediaButtons();
    
    postButton.addEventListener('click', function() {
        const text = postText.value.trim();
        if (text !== '' || mediaToUpload.url) {
            createNewPost(text, mediaToUpload);
            postText.value = '';
            resetMediaUpload();
        }
    });
    
    function loadSavedPosts() {
        if (postsContainer) { // Ensure postsContainer exists
            while (postsContainer.firstChild) {
                postsContainer.removeChild(postsContainer.firstChild);
            }
            if (memoryStorage.posts && memoryStorage.posts.length > 0) {
                memoryStorage.posts.forEach(post => {
                    recreatePostFromMemory(post);
                });
            }
        }
    }
    
    function recreatePostFromMemory(postData) {
        const postElement = document.createElement('div');
        postElement.className = 'card post-card';
        postElement.id = postData.id;
        
        let mediaHTML = '';
        if (postData.media && postData.media.url) {
            if (postData.media.type === 'photo') {
                mediaHTML = `<div class="post-media"><img src="${postData.media.url}" alt="Post image" class="post-image"></div>`;
            } else if (postData.media.type === 'video') {
                mediaHTML = `<div class="post-media"><video src="${postData.media.url}" controls class="post-video"></video></div>`;
            }
        }
        
        const timeString = postData.timestamp ? formatTimestamp(postData.timestamp) : 'Just now';
        
        postElement.innerHTML = `
            <div class="post-header">
                <img src="${postData.userProfilePic || memoryStorage.profilePic}" alt="User Profile" class="post-avatar">
                <div>
                    <h4>${postData.userName || memoryStorage.userName}</h4>
                    <p class="post-time">${timeString}</p>
                </div>
                <div class="post-menu">
                    <i class="fas fa-ellipsis-h post-menu-icon"></i>
                    <div class="post-menu-dropdown" style="display: none;">
                        <div class="dropdown-item delete-post-btn" data-post-id="${postData.id}">Delete</div>
                    </div>
                </div>
            </div>
            <div class="post-content">
                ${postData.text ? `<p>${postData.text}</p>` : ''}
                ${mediaHTML}
            </div>
            <div class="post-actions">
                <div class="action-btn like-btn ${postData.liked ? 'liked' : ''}" data-post-id="${postData.id}">
                    <i class="fas fa-thumbs-up"></i> Like <span class="like-count">${postData.likeCount || 0}</span>
                </div>
                <div class="action-btn comment-btn" data-post-id="${postData.id}">
                    <i class="fas fa-comment"></i> Comment ${postData.comments && postData.comments.length > 0 ? `(${postData.comments.length})` : ''}
                </div>
                <div class="action-btn share-btn" data-post-id="${postData.id}">
                    <i class="fas fa-share"></i> Share
                </div>
            </div>
            <div class="comment-section" style="display: none;">
                <div class="comment-input">
                    <img src="${memoryStorage.profilePic}" alt="Your Profile" class="comment-avatar smaller">
                    <input type="text" class="comment-text" placeholder="Write a comment...">
                    <button class="comment-submit btn btn-sm primary" data-post-id="${postData.id}">Post</button>
                </div>
                <div class="comments-list"></div>
            </div>
        `;
        
        if (postsContainer) postsContainer.appendChild(postElement);
        setupPostEventListeners(postData.id);
        
        if (postData.comments && postData.comments.length > 0) {
            const commentsList = postElement.querySelector('.comments-list');
            postData.comments.forEach(comment => {
                addCommentToDOM(commentsList, comment, memoryStorage.profilePic, memoryStorage.userName);
            });
        }
    }
    
    function formatTimestamp(timestamp) {
        const now = new Date();
        const postTime = new Date(timestamp);
        const diffSeconds = Math.floor((now - postTime) / 1000);

        if (diffSeconds < 5) return 'Just now';
        if (diffSeconds < 60) return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`;
        
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return postTime.toLocaleDateString(undefined, options);
    }
    
    function addCommentToDOM(commentsList, commentData, commenterProfilePic, commenterName) {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment-item';
        commentElement.dataset.commentId = commentData.id;
        
        const timeString = commentData.timestamp ? formatTimestamp(commentData.timestamp) : 'Just now';
        
        commentElement.innerHTML = `
            <div class="comment-header">
                <img src="${commenterProfilePic}" alt="User Profile" class="comment-avatar smaller">
                <div class="comment-info">
                    <h5>${commenterName}</h5>
                    <p>${commentData.text}</p>
                </div>
            </div>
            <div class="comment-actions">
                <span class="comment-like ${commentData.liked ? 'liked' : ''}">Like</span>
                <span class="comment-reply">Reply</span>
                <span class="comment-time">${timeString}</span>
            </div>
        `;
        
        commentElement.querySelector('.comment-like').addEventListener('click', function() {
            const postId = commentsList.closest('.post-card').id;
            const commentId = commentElement.dataset.commentId;
            const isLiked = memoryStorage.toggleCommentLike(postId, commentId);
            
            if (isLiked !== null) {
                this.classList.toggle('liked', isLiked);
            }
        });
        
        commentsList.appendChild(commentElement);
    }
    
    function createNewPost(text, media = null) {
        const postId = 'post-' + Date.now();
        const timestamp = Date.now();
        
        const postData = {
            id: postId,
            text: text,
            timestamp: timestamp,
            media: media.url ? { type: media.type, url: media.url } : null,
            likeCount: 0,
            liked: false,
            comments: [],
            userProfilePic: memoryStorage.profilePic, // Store current user's pic with the post
            userName: memoryStorage.userName // Store current user's name with the post
        };
        
        memoryStorage.addPost(postData);
        
        const postElement = document.createElement('div');
        postElement.className = 'card post-card';
        postElement.id = postId;
        
        let mediaHTML = '';
        if (media && media.url) {
            if (media.type === 'photo') {
                mediaHTML = `<div class="post-media"><img src="${media.url}" alt="Post image" class="post-image"></div>`;
            } else if (media.type === 'video') {
                mediaHTML = `<div class="post-media"><video src="${media.url}" controls class="post-video"></video></div>`;
            }
        }
        
        postElement.innerHTML = `
            <div class="post-header">
                <img src="${memoryStorage.profilePic}" alt="Your Profile" class="post-avatar">
                <div>
                    <h4>${memoryStorage.userName}</h4>
                    <p class="post-time">Just now</p>
                </div>
                <div class="post-menu">
                    <i class="fas fa-ellipsis-h post-menu-icon"></i>
                    <div class="post-menu-dropdown" style="display: none;">
                        <div class="dropdown-item delete-post-btn" data-post-id="${postId}">Delete</div>
                    </div>
                </div>
            </div>
            <div class="post-content">
                ${text ? `<p>${text}</p>` : ''}
                ${mediaHTML}
            </div>
            <div class="post-actions">
                <div class="action-btn like-btn" data-post-id="${postId}">
                    <i class="fas fa-thumbs-up"></i> Like <span class="like-count">0</span>
                </div>
                <div class="action-btn comment-btn" data-post-id="${postId}">
                    <i class="fas fa-comment"></i> Comment
                </div>
                <div class="action-btn share-btn" data-post-id="${postId}">
                    <i class="fas fa-share"></i> Share
                </div>
            </div>
            <div class="comment-section" style="display: none;">
                <div class="comment-input">
                    <img src="${memoryStorage.profilePic}" alt="Your Profile" class="comment-avatar smaller">
                    <input type="text" class="comment-text" placeholder="Write a comment...">
                    <button class="comment-submit btn btn-sm primary" data-post-id="${postId}">Post</button>
                </div>
                <div class="comments-list"></div>
            </div>
        `;
        
        if(postsContainer) postsContainer.insertBefore(postElement, postsContainer.firstChild);
        setupPostEventListeners(postId);
    }

    function handleDeletePost(postId) {
        if (confirm('Are you sure you want to delete this post?')) {
            const success = memoryStorage.deletePost(postId);
            if (success) {
                const postElement = document.getElementById(postId);
                if (postElement) {
                    postElement.remove();
                }
            } else {
                console.error("Failed to delete post from memory.");
            }
        }
    }
    
    function setupPostEventListeners(postId) {
        const postElement = document.getElementById(postId);
        if (!postElement) return;

        const likeButton = postElement.querySelector('.like-btn');
        const commentButton = postElement.querySelector('.comment-btn');
        const commentSubmitButton = postElement.querySelector('.comment-submit');
        const commentTextInput = postElement.querySelector('.comment-text');
        const menuIcon = postElement.querySelector('.post-menu-icon');
        const dropdown = postElement.querySelector('.post-menu-dropdown');
        const deleteBtn = postElement.querySelector('.delete-post-btn');

        if (likeButton) {
            likeButton.addEventListener('click', () => handleLikeAction(postId));
        }
        if (commentButton) {
            commentButton.addEventListener('click', () => toggleCommentSection(postId));
        }
        if (commentSubmitButton) {
            commentSubmitButton.addEventListener('click', () => submitComment(postId));
        }
        if (commentTextInput) {
            commentTextInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) { // Post on Enter, not Shift+Enter
                    event.preventDefault();
                    submitComment(postId);
                }
            });
        }

        if (menuIcon && dropdown) {
            menuIcon.addEventListener('click', (event) => {
                event.stopPropagation();
                // Close other open dropdowns
                document.querySelectorAll('.post-menu-dropdown').forEach(dd => {
                    if (dd !== dropdown) {
                        dd.style.display = 'none';
                    }
                });
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                handleDeletePost(postId);
                if (dropdown) dropdown.style.display = 'none';
            });
        }
    }

    // Global click listener to close dropdowns
    document.addEventListener('click', function(event) {
        document.querySelectorAll('.post-menu-dropdown').forEach(dropdown => {
            const menu = dropdown.closest('.post-menu');
            if (menu && !menu.contains(event.target)) { // Clicked outside the menu containing this dropdown
                dropdown.style.display = 'none';
            }
        });
    });
    
    function handleLikeAction(postId) {
        const likeResult = memoryStorage.togglePostLike(postId);
        if (likeResult) {
            const postElement = document.getElementById(postId);
            const likeButton = postElement.querySelector('.like-btn');
            const likeCount = likeButton.querySelector('.like-count');
            
            likeButton.classList.toggle('liked', likeResult.liked);
            likeCount.textContent = likeResult.likeCount.toString();
        }
    }
    
    function toggleCommentSection(postId) {
        const commentSection = document.getElementById(postId).querySelector('.comment-section');
        const commentInput = document.getElementById(postId).querySelector('.comment-text');
        
        if (commentSection.style.display === 'none' || !commentSection.style.display) {
            commentSection.style.display = 'block';
            if (commentInput) commentInput.focus();
        } else {
            commentSection.style.display = 'none';
        }
    }
    
    function submitComment(postId) {
        const postElement = document.getElementById(postId);
        const commentText = postElement.querySelector('.comment-text');
        const commentsList = postElement.querySelector('.comments-list');
        const text = commentText.value.trim();
        
        if (text !== '') {
            const commentId = 'comment-' + Date.now();
            const timestamp = Date.now();
            
            const commentData = {
                id: commentId,
                text: text,
                timestamp: timestamp,
                liked: false
            };
            
            const newCommentId = memoryStorage.addComment(postId, commentData);
            if (newCommentId) {
                addCommentToDOM(commentsList, commentData, memoryStorage.profilePic, memoryStorage.userName);
                commentText.value = '';
                
                const commentBtn = postElement.querySelector('.comment-btn');
                const postData = memoryStorage.posts.find(p => p.id === postId);
                const commentCount = postData ? (postData.comments ? postData.comments.length : 0) : 0;
                commentBtn.innerHTML = `<i class="fas fa-comment"></i> Comment ${commentCount > 0 ? `(${commentCount})` : ''}`;
            }
        }
    }
     
    function initializeExistingPosts() {
        // This function processes any .post-card elements in the HTML that don't have an ID yet.
        // For this project, posts are typically loaded from localStorage or created dynamically.
        // If you were to put static HTML posts in `posts-container`, this would try to wire them up.
        document.querySelectorAll('.post-card:not([id])').forEach((post, index) => {
            const postId = 'existing-post-' + Date.now() + '-' + index; // More unique ID
            post.id = postId;
            
            // Ensure essential classes and data attributes are present for event listeners
            const likeBtn = post.querySelector('.action-btn:nth-child(1)');
            if (likeBtn && !likeBtn.classList.contains('like-btn')) {
                likeBtn.classList.add('like-btn');
                likeBtn.dataset.postId = postId;
                if (!likeBtn.querySelector('.like-count')) { // Add like count span if missing
                    likeBtn.innerHTML = `<i class="fas fa-thumbs-up"></i> Like <span class="like-count">0</span>`;
                }
            }

            const commentBtn = post.querySelector('.action-btn:nth-child(2)');
            if (commentBtn && !commentBtn.classList.contains('comment-btn')) {
                commentBtn.classList.add('comment-btn');
                commentBtn.dataset.postId = postId;
            }

            // Ensure post menu structure for delete functionality
            let postHeader = post.querySelector('.post-header');
            if (postHeader) {
                let postMenu = postHeader.querySelector('.post-menu');
                if (!postMenu) { // If no menu div, create it
                    postMenu = document.createElement('div');
                    postMenu.className = 'post-menu';
                    postHeader.appendChild(postMenu); 
                }
                // Ensure icon and dropdown exist
                if (!postMenu.querySelector('.post-menu-icon')) {
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-ellipsis-h post-menu-icon';
                    postMenu.appendChild(icon);
                }
                if (!postMenu.querySelector('.post-menu-dropdown')) {
                    const dropdown = document.createElement('div');
                    dropdown.className = 'post-menu-dropdown';
                    dropdown.style.display = 'none';
                    dropdown.innerHTML = `<div class="dropdown-item delete-post-btn" data-post-id="${postId}">Delete</div>`;
                    postMenu.appendChild(dropdown);
                } else { // If dropdown exists, ensure delete button has correct postId
                    const delBtn = postMenu.querySelector('.delete-post-btn');
                    if (delBtn) delBtn.dataset.postId = postId;
                }
            }

            // Ensure comment section structure
            let commentSection = post.querySelector('.comment-section');
            if (!commentSection) {
                commentSection = document.createElement('div');
                commentSection.className = 'comment-section';
                commentSection.style.display = 'none';
                commentSection.innerHTML = `
                    <div class="comment-input">
                        <img src="${memoryStorage.profilePic}" alt="Your Profile" class="comment-avatar smaller">
                        <input type="text" class="comment-text" placeholder="Write a comment...">
                        <button class="comment-submit btn btn-sm primary" data-post-id="${postId}">Post</button>
                    </div>
                    <div class="comments-list"></div>
                `;
                post.appendChild(commentSection);
            } else { // If exists, ensure button has correct postId
                 const submitBtn = commentSection.querySelector('.comment-submit');
                 if (submitBtn) submitBtn.dataset.postId = postId;
            }
            
            setupPostEventListeners(postId);
            
            // Optional: Try to parse post data and add to memoryStorage if not already there
            // This part can be complex if HTML structure varies a lot.
            if (!memoryStorage.posts.some(p => p.id === postId)) {
                const postTextContent = post.querySelector('.post-content p')?.textContent || '';
                // Simplified media detection
                const postImage = post.querySelector('.post-content .post-image');
                const postVideo = post.querySelector('.post-content .post-video');
                let mediaData = null;
                if (postImage) mediaData = { type: 'photo', url: postImage.src };
                else if (postVideo) mediaData = { type: 'video', url: postVideo.src };

                const staticPostData = {
                    id: postId,
                    text: postTextContent,
                    timestamp: Date.now() - (index * 60000), // stagger timestamp
                    media: mediaData,
                    likeCount: parseInt(post.querySelector('.like-count')?.textContent || '0'),
                    liked: post.querySelector('.like-btn')?.classList.contains('liked') || false,
                    comments: [], // Comments would need more complex parsing
                    userProfilePic: post.querySelector('.post-avatar')?.src || memoryStorage.profilePic,
                    userName: post.querySelector('.post-header h4')?.textContent || memoryStorage.userName
                };
                memoryStorage.addPost(staticPostData); // Adds to start, might reorder if static posts are last
            }
        });
    }
    
    function setupProfilePicChanger(initialProfilePic) {
        const createPostInputAvatar = document.querySelector('.create-post .post-input .post-avatar');
        if (createPostInputAvatar) {
            createPostInputAvatar.src = initialProfilePic; // Set initial avatar for create post input
        }
        
        const profilePicChanger = document.createElement('div');
        profilePicChanger.className = 'profile-pic-changer';

        profilePicChanger.innerHTML = `
            <div class="profile-pic-container">
                <img src="${initialProfilePic}" alt="Your Profile" id="current-profile-pic">
                <div class="change-pic-overlay">Change Picture</div>
            </div>
            <div class="profile-pic-modal" style="display: none;">
                <div class="modal-content">
                    <h3>Choose Your Profile Picture</h3>
                    <div class="profile-pic-options">
                        <img src="images/a.jpg" alt="Option 1" class="pic-option" data-src="images/a.jpg">
                        <img src="images/s.jpg" alt="Option 2" class="pic-option" data-src="images/s.jpg">
                        <img src="images/i.jpg" alt="Option 3" class="pic-option" data-src="images/i.jpg">
                        <img src="images/u.jpg" alt="Option 4" class="pic-option" data-src="images/u.jpg">
                        <img src="images/g.jpg" alt="Option 5" class="pic-option" data-src="images/g.jpg">
                    </div>
                    <div class="modal-buttons">
                        <button id="cancel-profile-pic" class="btn secondary">Cancel</button>
                        <button id="save-profile-pic" class="btn primary">Save</button>
                    </div>
                </div>
            </div>
        `;

        const header = document.querySelector('header');
        if (header) {
            header.parentNode.insertBefore(profilePicChanger, header.nextSibling);
        } else {
            document.body.prepend(profilePicChanger);
        }

        const style = document.createElement('style');
        style.textContent = `
            .profile-pic-changer {
                display: flex;
                justify-content: center;
                margin: 20px 0;
                position: relative;
            }
            .profile-pic-container {
                position: relative;
                width: 100px;
                height: 100px;
                border-radius: 50%;
                overflow: hidden;
                cursor: pointer;
                border: 3px solid #d64c7f; 
            }
            #current-profile-pic {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .change-pic-overlay {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0,0,0,0.6);
                color: white;
                text-align: center;
                padding: 5px 0;
                font-size: 12px;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .profile-pic-container:hover .change-pic-overlay {
                opacity: 1;
            }
            .profile-pic-modal {
                position: fixed;
                z-index: 1050; /* Ensure above other elements like sticky header */
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.7);
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .profile-pic-modal .modal-content { /* Scoped to avoid conflict with bootstrap if any */
                background-color: white;
                padding: 25px;
                border-radius: 8px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            }
            .profile-pic-options {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 15px;
                margin: 20px 0;
            }
            .pic-option {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                cursor: pointer;
                border: 3px solid transparent;
                transition: all 0.2s ease-in-out;
                object-fit: cover;
            }
            .pic-option:hover {
                transform: scale(1.05);
            }
            .pic-option.selected {
                border-color: #d64c7f;
                box-shadow: 0 0 10px rgba(214, 76, 127, 0.5);
            }
            .profile-pic-modal .modal-buttons { /* Scoped */
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
        `;
        document.head.appendChild(style);

        const picContainer = document.querySelector('.profile-pic-container');
        const modal = document.querySelector('.profile-pic-modal');
        const cancelBtn = document.getElementById('cancel-profile-pic');
        const saveBtn = document.getElementById('save-profile-pic');
        const picOptions = document.querySelectorAll('.pic-option');
        let selectedPicSrc = initialProfilePic;

        // Mark initial selection
        picOptions.forEach(option => {
            if (option.dataset.src === initialProfilePic) {
                option.classList.add('selected');
            }
        });

        picContainer.addEventListener('click', () => modal.style.display = 'flex');
        cancelBtn.addEventListener('click', () => modal.style.display = 'none');
        
        picOptions.forEach(option => {
            option.addEventListener('click', () => {
                picOptions.forEach(p => p.classList.remove('selected'));
                option.classList.add('selected');
                selectedPicSrc = option.dataset.src;
            });
        });
        
        saveBtn.addEventListener('click', () => {
            userProfilePic = selectedPicSrc; // Update global variable
            memoryStorage.saveProfilePic(selectedPicSrc); // Save to localStorage

            document.getElementById('current-profile-pic').src = selectedPicSrc;
            
            // Update avatar in create post section
            if (createPostInputAvatar) createPostInputAvatar.src = selectedPicSrc;

            // Update avatars in all existing posts and comments
            document.querySelectorAll('.post-avatar, .comment-avatar').forEach(img => {
                // Only update if it's the user's own avatar (e.g., based on current src or a data attribute)
                // For simplicity here, updating all, but in a real app, you'd be more specific.
                // If posts store their own userProfilePic, this might not be needed or behave differently.
                const postCard = img.closest('.post-card');
                if (postCard) {
                    const postData = memoryStorage.posts.find(p => p.id === postCard.id);
                    // Only update avatar if it's a post by the current user
                    // This check is a bit simplified; ideally, posts would store a userId
                    if (postData && postData.userName === memoryStorage.userName) {
                         img.src = selectedPicSrc;
                         if (img.classList.contains('post-avatar') && !img.closest('.comment-input')) {
                             postData.userProfilePic = selectedPicSrc; // Update in memory too
                         }
                    }
                } else if (img.closest('.comment-input') || img.closest('.comment-header')) {
                    // Update current user's comment avatars
                     img.src = selectedPicSrc;
                }
            });
            memoryStorage.savePosts(); // Save changes to posts in memory
            modal.style.display = 'none';
        });
    }
    
    function setupMediaButtons() {
        const createPostDiv = document.querySelector('.create-post');
        if (!createPostDiv) return;

        const mediaButtonsContainer = document.createElement('div');
        mediaButtonsContainer.className = 'media-buttons-container';
        mediaButtonsContainer.innerHTML = `
            <div class="media-preview" style="display: none;">
                <div class="media-content-wrapper"></div> <!-- Wrapper for easier styling -->
                <button class="remove-media-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="media-buttons">
                <button class="media-btn photo-btn" title="Add Photo">
                    <i class="fas fa-image"></i> Photo
                </button>
                <button class="media-btn video-btn" title="Add Video">
                    <i class="fas fa-video"></i> Video
                </button>
            </div>
            <input type="file" id="photo-upload" accept="image/*" style="display: none;">
            <input type="file" id="video-upload" accept="video/*" style="display: none;">
        `;
        
        const postButtonElement = document.getElementById('post-button');
        if (postButtonElement) {
            createPostDiv.insertBefore(mediaButtonsContainer, postButtonElement);
        } else {
            // Fallback if post button isn't found, though it should be
            createPostDiv.appendChild(mediaButtonsContainer);
        }
        
        // Add CSS for media buttons and preview if not already in main CSS
        const mediaStyle = document.createElement('style');
        mediaStyle.textContent = `
            .media-buttons-container { margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }
            .media-buttons { display: flex; gap: 10px; }
            .media-btn { display: flex; align-items: center; gap: 5px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 20px; background: #f0f2f5; cursor: pointer; transition: background 0.3s; font-size: 0.9rem; }
            .media-btn:hover { background: #e4e6e9; }
            .media-btn i { color: #d64c7f; }
            .media-preview { margin-top: 10px; position: relative; border-radius: 8px; overflow: hidden; max-width: 100%; border: 1px solid #eee;}
            .media-content-wrapper img, .media-content-wrapper video { max-width: 100%; max-height: 250px; display: block; border-radius: 8px; margin: auto; }
            .remove-media-btn { position: absolute; top: 8px; right: 8px; background: rgba(0, 0, 0, 0.6); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.8rem; }
            .remove-media-btn:hover { background: rgba(0,0,0,0.8); }
            .post-media { margin: 10px 0; } /* Ensure this is styled in main CSS if post-media div is used */
        `;
        document.head.appendChild(mediaStyle);
        
        const photoBtn = mediaButtonsContainer.querySelector('.photo-btn');
        const videoBtn = mediaButtonsContainer.querySelector('.video-btn');
        const photoUpload = mediaButtonsContainer.querySelector('#photo-upload');
        const videoUpload = mediaButtonsContainer.querySelector('#video-upload');
        const mediaPreview = mediaButtonsContainer.querySelector('.media-preview');
        const mediaContentWrapper = mediaButtonsContainer.querySelector('.media-content-wrapper');
        const removeMediaBtn = mediaButtonsContainer.querySelector('.remove-media-btn');
        
        photoBtn.addEventListener('click', () => photoUpload.click());
        videoBtn.addEventListener('click', () => videoUpload.click());
        
        photoUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    mediaToUpload = { type: 'photo', url: e.target.result };
                    mediaContentWrapper.innerHTML = `<img src="${e.target.result}" alt="Photo preview">`;
                    mediaPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
            event.target.value = null; // Reset input to allow same file selection again
        });
        
        videoUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    mediaToUpload = { type: 'video', url: e.target.result };
                    mediaContentWrapper.innerHTML = `<video src="${e.target.result}" controls></video>`;
                    mediaPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
            event.target.value = null; // Reset input
        });
        
        removeMediaBtn.addEventListener('click', resetMediaUpload);
    }
    
    function resetMediaUpload() {
        mediaToUpload = { type: null, url: null };
        const mediaPreview = document.querySelector('.media-buttons-container .media-preview');
        const mediaContentWrapper = document.querySelector('.media-buttons-container .media-content-wrapper');
        
        if (mediaPreview) mediaPreview.style.display = 'none';
        if (mediaContentWrapper) mediaContentWrapper.innerHTML = '';
        
        const photoUploadInput = document.getElementById('photo-upload');
        const videoUploadInput = document.getElementById('video-upload');
        if (photoUploadInput) photoUploadInput.value = '';
        if (videoUploadInput) videoUploadInput.value = '';
    }
});