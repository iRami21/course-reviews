// Global variables
let currentUser = null;
let currentCourseId = null;
let allCourses = [];
let selectedRating = 0;

// Sample course data (will be replaced with API calls)
const sampleCourses = [
  {
    id: 1,
    code: "CS101",
    title: "Introduction to Computer Science",
    titleZh: "計算機科學導論",
    professor: "Dr. Wang",
    department: "Computer Science",
    credits: 3,
    rating: 4.5,
    reviewCount: 2,
    followed: false,
    year: 2024,
    semester: 1,
    description: "Fundamental concepts of computer science and programming",
  },
  {
    id: 2,
    code: "MATH201",
    title: "Calculus II",
    titleZh: "微積分二",
    professor: "Prof. Chen",
    department: "Mathematics",
    credits: 4,
    rating: 3.0,
    reviewCount: 1,
    followed: false,
    year: 2024,
    semester: 1,
    description:
      "Advanced techniques for integration, series, and applications",
  },
  {
    id: 3,
    code: "ENG102",
    title: "Academic Writing",
    titleZh: "學術寫作",
    professor: "Dr. Liu",
    department: "English",
    credits: 3,
    rating: 5.0,
    reviewCount: 1,
    followed: false,
    year: 2024,
    semester: 2,
    description:
      "Academic essay structure, research writing, and revision skills",
  },
  {
    id: 4,
    code: "PHYS101",
    title: "Physics I",
    titleZh: "物理學一",
    professor: "Dr. Lin",
    department: "Physics",
    credits: 4,
    rating: 4.0,
    reviewCount: 3,
    followed: false,
    year: 2023,
    semester: 2,
    description:
      "Mechanics, motion, forces, energy, and foundational physics models",
  },
];

const courseReviews = {
  1: [
    {
      id: "cs101-r1",
      author: "student123",
      rating: 5,
      date: "2024-03-15",
      language: "中文",
      text: "Excellent course! Dr. Wang explains concepts very clearly.",
      likes: 12,
      liked: false,
      replies: [
        {
          id: "cs101-r1-reply1",
          author: "student789",
          avatar: {
            avatarAnimal: "monkey",
            gender: "female",
          },
          date: "2024-03-16",
          text: "Totally agree. The examples in class were really helpful.",
          likes: 4,
          liked: false,
        },
      ],
    },
    {
      id: "cs101-r2",
      author: "student456",
      rating: 4,
      date: "2024-03-10",
      language: "English",
      text: "Good content and helpful assignments, but sometimes moves too fast.",
      likes: 5,
      liked: false,
      replies: [],
    },
  ],
  2: [
    {
      id: "math201-r1",
      author: "mathFan",
      rating: 3,
      date: "2024-04-02",
      language: "English",
      text: "Useful course, though the weekly workload is heavy.",
      likes: 3,
      liked: false,
      replies: [],
    },
  ],
  3: [
    {
      id: "eng102-r1",
      author: "writer01",
      rating: 5,
      date: "2024-04-18",
      language: "English",
      text: "The writing feedback is practical and easy to apply.",
      likes: 8,
      liked: false,
      replies: [],
    },
  ],
  4: [
    {
      id: "phys101-r1",
      author: "labStudent",
      rating: 5,
      date: "2023-12-04",
      language: "中文",
      text: "Lectures are organized and the labs make the concepts easier to understand.",
      likes: 6,
      liked: false,
      replies: [],
    },
    {
      id: "phys101-r2",
      author: "scienceMajor",
      rating: 4,
      date: "2023-11-21",
      language: "English",
      text: "Clear examples and fair exams.",
      likes: 4,
      liked: false,
      replies: [],
    },
    {
      id: "phys101-r3",
      author: "freshman",
      rating: 3,
      date: "2023-10-08",
      language: "English",
      text: "The pace can be challenging, but office hours help.",
      likes: 2,
      liked: false,
      replies: [],
    },
  ],
};

// Utility functions to generate SVG icons
function starIcon(fillPercent = 100) {
  const fill = Math.max(0, Math.min(100, fillPercent));
  const id = `star-fill-${Math.round(fill)}-${Math.random().toString(36).slice(2)}`;

  return `
    <svg class="rating-icon" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="${fill}%" stop-color="currentColor"></stop>
          <stop offset="${fill}%" stop-color="transparent"></stop>
        </linearGradient>
      </defs>
      <path class="rating-icon-bg" d="M12 2.8l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.8z"></path>
      <path fill="url(#${id})" d="M12 2.8l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.8z"></path>
      <path class="rating-icon-stroke" d="M12 2.8l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.8z"></path>
    </svg>
  `;
}

function generateStars(rating, totalStars = 5) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  let stars = "";

  for (let i = 1; i <= totalStars; i += 1) {
    if (i <= fullStars) {
      stars += starIcon();
    } else if (i === fullStars + 1 && hasHalfStar) {
      stars += starIcon(50);
    } else {
      stars += starIcon(0);
    }
  }

  return stars;
}

function checkIcon() {
  return `
    <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9 17l-5-5"></path>
    </svg>
  `;
}

function bookmarkIcon() {
  return `
    <svg class="bookmark-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"></path>
    </svg>
  `;
}

function questionIcon() {
  return avatarImage("question");
}

function avatarImage(name) {
  return `<img class="avatar-img" src="../static/icons/${name}.svg" alt="" />`;
}

function getGenderClass(gender = "undisclosed") {
  if (gender === "male") return "avatar-male";
  if (gender === "female") return "avatar-female";
  return "avatar-undisclosed";
}

function avatarIcon(profile) {
  if (!profile) return questionIcon();

  const animal = profile.avatarAnimal || "question";
  return avatarImage(animal);
}

function getDefaultProfile(username) {
  return {
    username: username,
    avatarAnimal: "question",
    gender: "undisclosed",
  };
}

function getDisplayName(user) {
  return typeof user === "string" ? user : user?.username;
}

function translateIcon() {
  return `
    <svg class="language-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 8 6 6"></path>
      <path d="m4 14 6-6 2-3"></path>
      <path d="M2 5h12"></path>
      <path d="M7 2h1"></path>
      <path d="m22 22-5-10-5 10"></path>
      <path d="M14 18h6"></path>
    </svg>
  `;
}

function heartIcon() {
  return `
    <svg class="heart-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.7 0L12 5.7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 21l8.8-8.7a5.4 5.4 0 0 0 0-7.7z"></path>
    </svg>
  `;
}

function replyIcon() {
  return `
    <svg class="reply-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 17-5-5 5-5"></path>
      <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
    </svg>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initialize the page
document.addEventListener("DOMContentLoaded", function () {
  allCourses = JSON.parse(JSON.stringify(sampleCourses));
  displayCourses(allCourses);
  setupEventListeners();
  checkUserLogin();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById("userAvatar").addEventListener("click", function () {
    if (currentUser) {
      showFavorites();
    } else {
      openLoginModal();
    }
  });
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("authForm").addEventListener("submit", login);
  document.getElementById("searchBox").addEventListener("input", filterCourses);
  document
    .getElementById("yearFilter")
    .addEventListener("change", filterCourses);
  document
    .getElementById("departmentFilter")
    .addEventListener("change", filterCourses);
  document
    .getElementById("ratingFilter")
    .addEventListener("change", filterCourses);
  document
    .getElementById("sortFilter")
    .addEventListener("change", filterCourses);
  document
    .getElementById("favoriteDepartmentFilter")
    .addEventListener("change", renderFavorites);
  document
    .getElementById("favoriteRatingFilter")
    .addEventListener("change", renderFavorites);
  document
    .getElementById("favoriteSortFilter")
    .addEventListener("change", renderFavorites);
  document
    .getElementById("avatarAnimal")
    .addEventListener("change", updateAvatarPreview);
  document.getElementById("gender").addEventListener("change", updateAvatarPreview);
}

// Display courses
function displayCourses(courses) {
  const container = document.getElementById("coursesContainer");
  renderCourseCards(container, courses, "No courses found.");
}

function renderCourseCards(container, courses, emptyText) {
  container.innerHTML = "";

  if (courses.length === 0) {
    container.innerHTML = `<p class="empty-state">${emptyText}</p>`;
    return;
  }

  courses.forEach((course) => {
    const courseCard = document.createElement("div");
    courseCard.className = "course-card";
    courseCard.onclick = () => openCourseDetail(course.id);

    const semesterText = `${course.year} S${course.semester}`;

    courseCard.innerHTML = `
            <div class="course-card-header">
                <div class="course-card-tags">
                  <div class="course-code">${course.code}</div>
                  <div class="course-semester">${semesterText}</div>
                </div>
                <button
                  class="course-follow-btn ${course.followed ? "followed" : ""}"
                  onclick="event.stopPropagation(); toggleFollow(${course.id})"
                  aria-label="${course.followed ? "Unfollow course" : "Follow course"}"
                  title="${course.followed ? "Saved" : "Save course"}"
                >
                  ${bookmarkIcon()}
                </button>
            </div>
            
            <div class="course-title-section">
                <div class="course-title-copy">
                  <div class="course-title">${course.title}</div>
                  <div class="course-title-zh">${course.titleZh}</div>
                </div>
                <div class="course-rating-inline">${starIcon()}${course.rating.toFixed(1)}</div>
            </div>
            
            <div class="course-divider"></div>
            
            <div class="course-footer" onclick="event.stopPropagation();">
                <div class="course-reviews-count">
                    <span class="stat-save-display">
                        🔖 <span class="save-count-num" id="save-count-${course.id}">${course.saveCount || 0}</span>
                    </span>
                    <span class="stat-comment">💬 ${course.reviewCount}</span>
                </div>
                <button class="btn-reviews-card" onclick="openCourseReviewForm(${course.id})">Add Review</button>
            </div>
        `;

    container.appendChild(courseCard);
  });
}

// Filter courses based on search and filters
function filterCourses() {
  const searchTerm = document.getElementById("searchBox").value.toLowerCase();
  const year = document.getElementById("yearFilter").value;
  const department = document.getElementById("departmentFilter").value;
  const minRating = document.getElementById("ratingFilter").value
    ? parseFloat(document.getElementById("ratingFilter").value)
    : 0;
  const sortBy = document.getElementById("sortFilter").value;

  let filtered = allCourses.filter((course) => {
    const matchSearch =
      course.code.toLowerCase().includes(searchTerm) ||
      course.title.toLowerCase().includes(searchTerm) ||
      course.titleZh.includes(searchTerm) ||
      course.professor.toLowerCase().includes(searchTerm);

    const matchDept = !department || course.department === department;
    const matchRating = course.rating >= minRating;

    return matchSearch && matchDept && matchRating;
  });

  filtered = sortCourses(filtered, sortBy);

  displayCourses(filtered);
}

function sortCourses(courses, sortBy) {
  const sorted = [...courses];

  if (sortBy === "ratingDesc") {
    sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  } else if (sortBy === "ratingAsc") {
    sorted.sort((a, b) => a.rating - b.rating || b.reviewCount - a.reviewCount);
  } else if (sortBy === "reviewsDesc") {
    sorted.sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);
  } else if (sortBy === "reviewsAsc") {
    sorted.sort((a, b) => a.reviewCount - b.reviewCount || b.rating - a.rating);
  }

  return sorted;
}

// Toggle follow
function toggleFollow(courseId) {
  if (!currentUser) {
    alert("Please login to save courses.");
    openLoginModal();
    return;
  }

  const course = allCourses.find((c) => c.id === courseId);
  if (course) {
    course.followed = !course.followed;
    if (document.getElementById("favoritesPage").style.display === "block") {
      renderFavorites();
    } else {
      filterCourses();
    }
  }

  const countSpan = document.getElementById(`save-count-${courseId}`);
  if (!countSpan) return; 

  let currentCount = parseInt(countSpan.textContent);

  // 2. 透過判斷右上角按鈕現在有沒有 "followed" 這個 class，來決定數字加減
  // 先找出那一張卡片的按鈕元素
  const btn = document.querySelector(`[onclick*="toggleFollow(${courseId})"]`);
    
    if (btn) {
        // 如果點擊後按鈕身上有 followed，代表剛才的動作是「新增收藏」，數字 +1
        if (btn.classList.contains('followed')) {
            currentCount += 1;
        } else {
            // 反之，如果 class 沒了，代表是「取消收藏」，數字 -1
            currentCount -= 1;
        }  
    }

    if (currentCount < 0) {
        currentCount = 0; // 用一個等號來重新賦值
    }

    // 3. 把算好的新數字塞回左下角畫面上
    countSpan.textContent = currentCount;
}

function showFavorites() {
  if (!currentUser) {
    alert("Please login to view favorites.");
    openLoginModal();
    return;
  }

  document.getElementById("pageHeading").style.display = "none";
  document.querySelector(".filters").style.display = "none";
  document.getElementById("coursesContainer").style.display = "none";
  document.getElementById("courseDetailPage").style.display = "none";
  document.getElementById("favoritesPage").style.display = "block";
  renderFavorites();
}

function showBrowseCourses() {
  document.getElementById("favoritesPage").style.display = "none";
  document.getElementById("pageHeading").style.display = "";
  document.querySelector(".filters").style.display = "";
  document.getElementById("coursesContainer").style.display = "";
  filterCourses();
}

function renderFavorites() {
  const department = document.getElementById("favoriteDepartmentFilter").value;
  const minRating = document.getElementById("favoriteRatingFilter").value
    ? parseFloat(document.getElementById("favoriteRatingFilter").value)
    : 0;
  const sortBy = document.getElementById("favoriteSortFilter").value;
  const favorites = sortCourses(
    allCourses.filter((course) => {
      const matchSaved = course.followed;
      const matchDept = !department || course.department === department;
      const matchRating = course.rating >= minRating;
      return matchSaved && matchDept && matchRating;
    }),
    sortBy,
  );

  renderCourseCards(
    document.getElementById("favoritesContainer"),
    favorites,
    "No favorite courses yet.",
  );
}

// Login modal
function openLoginModal() {
  document.getElementById("loginModal").style.display = "block";

    // 🌟 每次一打開視窗，確保「角色選擇區」顯示，「登入表單區」先藏起來
    document.getElementById("roleSelectionSection").style.display = "flex";
    document.getElementById("actualLoginForm").style.display = "none";

}

function closeLoginModal() {
  document.getElementById("loginModal").style.display = "none";
}

function updateAvatarPreview() {
  const preview = document.getElementById("avatarPreview");
  const profile = {
    avatarAnimal: document.getElementById("avatarAnimal").value,
    gender: document.getElementById("gender").value,
  };

  preview.className = `avatar-preview ${getGenderClass(profile.gender)}`;
  preview.innerHTML = avatarIcon(profile);
}

function setRegisterMode(isRegistering) {
  const submitButton = document.querySelector("#authForm .btn-submit");
  const toggleText = document.querySelector(".toggle-register");
  const registerFields = document.getElementById("registerFields");
  const registerOnlyFields = document.querySelectorAll(".register-only");

  submitButton.dataset.mode = isRegistering ? "register" : "login";
  submitButton.textContent = isRegistering ? "Create Account" : "Login";
  registerFields.style.display = isRegistering ? "grid" : "none";
  registerOnlyFields.forEach((field) => {
    field.style.display = isRegistering ? "block" : "none";
    field.required = isRegistering;
  });
  if (isRegistering) updateAvatarPreview();
  toggleText.innerHTML = isRegistering
    ? 'Already have an account? <a href="#" onclick="toggleRegister(event)">Login here</a>'
    : 'Don\'t have an account? <a href="#" onclick="toggleRegister(event)">Register here</a>';
}

function toggleRegister(event) {
  event.preventDefault();
  const submitButton = document.querySelector("#authForm .btn-submit");
  const isRegistering = submitButton.dataset.mode === "register";
  setRegisterMode(!isRegistering);
}

function login(event) {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const isRegistering =
    document.querySelector("#authForm .btn-submit").dataset.mode === "register";

  if (isRegistering && password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (username && password && (!isRegistering || email)) {
    currentUser = isRegistering
      ? {
          username: username,
          email: email,
          avatarAnimal: document.getElementById("avatarAnimal").value,
          gender: document.getElementById("gender").value,
        }
      : getDefaultProfile(username);
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    updateAuthUI();
    closeLoginModal();
    document.getElementById("authForm").reset();
    setRegisterMode(false);
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem("currentUser");
  updateAuthUI();
}

function checkUserLogin() {
  const savedUser = localStorage.getItem("currentUser");
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (error) {
      currentUser = getDefaultProfile(savedUser);
    }
  }
  updateAuthUI();
}

function updateAuthUI() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userAvatar = document.getElementById("userAvatar");

  userAvatar.className = `user-avatar ${getGenderClass(currentUser?.gender)}`;
  userAvatar.innerHTML = avatarIcon(currentUser);

  if (currentUser) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    logoutBtn.textContent = `Logout (${getDisplayName(currentUser)})`;
    userAvatar.setAttribute("aria-label", getDisplayName(currentUser));
  } else {
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    userAvatar.setAttribute("aria-label", "Login");
  }
  // 🌟 新增：如果使用者已登入，大門優雅消失；沒登入則維持大門鎖定
    const landing = document.getElementById("landingScreen");
    if (landing) {
      if (currentUser) {
        landing.style.opacity = "0";
        landing.style.pointerEvents = "none";
        setTimeout(() => { landing.style.display = "none"; }, 400);
      } else {
        landing.style.display = "flex";
        landing.style.opacity = "1";
        landing.style.pointerEvents = "auto";
      }
    }
}

// Course detail page
function openCourseDetail(courseId) {
  const course = allCourses.find((c) => c.id === courseId);
  if (!course) return;

  currentCourseId = courseId;
  const reviews = getReviewsForCourse(courseId);
  const averageRating = getAverageRating(reviews, course.rating);

  document.getElementById("detailCourseCode").textContent = course.code;
  document.getElementById("detailCourseTitle").textContent = course.title;
  document.getElementById("detailCourseTitleZh").textContent = course.titleZh;
  document.getElementById("detailCourseProfessor").textContent =
    course.professor;
  document.getElementById("detailCourseDepartment").textContent =
    course.department;
  document.getElementById("detailCourseCredits").textContent = course.credits;
  document.getElementById("detailCourseDescription").textContent =
    course.description;
  document.getElementById("detailRatingValue").textContent =
    averageRating.toFixed(1);
  document.getElementById("detailStars").innerHTML =
    generateStars(averageRating);
  document.getElementById("detailReviewCount").textContent =
    `Based on ${reviews.length} review${reviews.length !== 1 ? "s" : ""}`;

  renderRatingBreakdown(reviews);
  loadReviews(courseId);

  document.body.classList.add("detail-open");
  document.querySelector(".navbar").style.display = "none";
  document.getElementById("pageHeading").style.display = "none";
  document.querySelector(".filters").style.display = "none";
  document.getElementById("coursesContainer").style.display = "none";
  document.getElementById("courseDetailPage").style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCourseReviewForm(courseId) {
  openCourseDetail(courseId);
  openReviewForm();
}

function closeCourseDetail() {
  document.getElementById("courseDetailPage").style.display = "none";
  document.body.classList.remove("detail-open");
  document.querySelector(".navbar").style.display = "";
  document.getElementById("pageHeading").style.display = "";
  document.querySelector(".filters").style.display = "";
  document.getElementById("coursesContainer").style.display = "";
  currentCourseId = null;
}

function getReviewsForCourse(courseId) {
  return courseReviews[courseId] || [];
}

function getAverageRating(reviews, fallbackRating) {
  if (reviews.length === 0) return fallbackRating;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
}

function renderRatingBreakdown(reviews) {
  const breakdown = document.getElementById("ratingBreakdown");
  const total = reviews.length;
  breakdown.innerHTML = "";

  for (let rating = 5; rating >= 1; rating -= 1) {
    const count = reviews.filter((review) => review.rating === rating).length;
    const percent = total > 0 ? (count / total) * 100 : 0;
    const row = document.createElement("div");
    row.className = "rating-breakdown-row";
    row.innerHTML = `
      <span class="rating-breakdown-label">${rating}${starIcon()}</span>
      <div class="rating-track">
        <span class="rating-bar" style="width: ${percent}%"></span>
      </div>
      <span class="rating-breakdown-count">${count}</span>
    `;

    breakdown.appendChild(row);
  }
}

// Load reviews
function loadReviews(courseId) {
  const reviews = getReviewsForCourse(courseId);

  const reviewsList = document.getElementById("reviewsList");
  reviewsList.innerHTML = "";

  if (reviews.length === 0) {
    reviewsList.innerHTML =
      '<p class="empty-reviews">No reviews yet. Be the first to write one.</p>';
    return;
  }

  reviews.forEach((review) => {
    const reviewItem = document.createElement("div");
    reviewItem.className = "review-item";

    const starsHtml = generateStars(review.rating);
    const replies = review.replies || [];
    const replyCountText =
      replies.length > 0
        ? `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`
        : "Reply";

    reviewItem.innerHTML = `
            <div class="review-header">
                <div class="review-meta">
                  <span class="review-avatar ${getGenderClass(review.avatar?.gender)}">${avatarIcon(review.avatar || getDefaultProfile(review.author))}</span>
                  <span class="review-author">${escapeHtml(review.author)}</span>
                  <span class="review-dot"></span>
                  <span class="review-date">${escapeHtml(review.date)}</span>
                </div>
                <span class="review-language" title="${escapeHtml(review.language)}" aria-label="${escapeHtml(review.language)}">${translateIcon()}</span>
            </div>
            <div class="review-rating-line">
                <span class="review-rating">${starsHtml}</span>
                <span class="review-score">${review.rating.toFixed(1)}</span>
            </div>
            <div class="review-text">${escapeHtml(review.text)}</div>
            
            <div class="review-actions">
              <div class="reaction-container" data-review-id="${review.id}">
                
                <button class="review-action-btn main-reaction-btn ${review.liked ? "liked" : ""}" onclick="handleQuickLike(event, '${review.id}')">
                  <span class="emoji-stack" id="emoji-stack-${review.id}">
                    <span class="emoji-item">${heartIcon()}</span>
                  </span>
                  <span class="like-count-num" id="like-count-${review.id}">${review.likes ?? 0}</span>
                </button>

                <div class="reaction-palette">
                  <button type="button" onclick="selectReviewEmoji(event, '${review.id}', '❤️', 'main')">❤️</button>
                  <button type="button" onclick="selectReviewEmoji(event, '${review.id}', '😮', 'main')">😮</button>
                  <button type="button" onclick="selectReviewEmoji(event, '${review.id}', '👍', 'main')">👍</button>
                  <button type="button" onclick="selectReviewEmoji(event, '${review.id}', '🔥', 'main')">🔥</button>
                </div>
              </div>

              <button class="review-action-btn" onclick="toggleReplyForm('${review.id}')">
                ${replyIcon()}
                <span>${replyCountText}</span>
              </button>
            </div>

              <div class="reply-form" id="replyForm-${review.id}" style="display: none">
              <input
                type="text"
                id="replyInput-${review.id}"
                placeholder="Write a reply..."
              />
              <button type="button" onclick="submitReply('${review.id}')">Post</button>
            </div>
            <div class="review-replies">
                ${replies
                  .map(
                    (reply) => `
                      <div class="reply-item">
                        <div class="reply-content">
                          <div class="reply-meta">
                            <span class="reply-avatar ${getGenderClass(reply.avatar?.gender)}">${avatarIcon(reply.avatar || getDefaultProfile(reply.author))}</span>
                            <strong>${escapeHtml(reply.author)}</strong>
                            <span>${escapeHtml(reply.date)}</span>
                          </div>
                          <p>${escapeHtml(reply.text)}</p>
                        </div>
                        
                        <div class="reaction-container" data-reply-id="${reply.id}">
                          
                          <button class="review-action-btn main-reaction-btn ${reply.liked ? "liked" : ""}" onclick="window.selectReviewEmoji(event, '${reply.id}', '❤️', 'reply')">
                            <span class="emoji-stack" id="reply-emoji-stack-${reply.id}">
                              <span class="emoji-item">❤️</span>
                            </span>
                            <span class="like-count-num" id="reply-like-count-${reply.id}">${reply.likes ?? 0}</span>
                          </button>

                          <div class="reaction-palette">
                            <button type="button" onclick="selectReviewEmoji(event, '${reply.id}', '❤️', 'reply')">❤️</button>
                            <button type="button" onclick="selectReviewEmoji(event, '${reply.id}', '😮', 'reply')">😮</button>
                            <button type="button" onclick="selectReviewEmoji(event, '${reply.id}', '👍', 'reply')">👍</button>
                            <button type="button" onclick="selectReviewEmoji(event, '${reply.id}', '🔥', 'reply')">🔥</button>
                          </div>
                        </div>
                        
                      </div>
                    `,
                  )
                  .join("")}
              </div>
        `;

    reviewsList.appendChild(reviewItem);
  });
}

// 依然維持這兩個獨立的記憶庫
const userReactedMainReviews = new Set(); 
const userReactedSubReplies = new Set();   

window.selectReviewEmoji = function(event, id, selectedEmoji, type = 'main') {
    event.stopPropagation();
    event.preventDefault();

    let countSpan, stackContainer, memorySet, defaultHeart;

    // 1. 根據傳入的類型分流，並設定預設的愛心（主評論和子回覆可能用不同的 heartIcon）
    if (type === 'main') {
        countSpan = document.getElementById(`like-count-${id}`);
        stackContainer = document.getElementById(`emoji-stack-${id}`);
        memorySet = userReactedMainReviews;
        defaultHeart = '❤️'; // 如果你們主評論原本有特殊的 heartIcon，也可以換成字串模板
    } else {
        countSpan = document.getElementById(`reply-like-count-${id}`);
        stackContainer = document.getElementById(`reply-emoji-stack-${id}`);
        memorySet = userReactedSubReplies;
        defaultHeart = '❤️';
    }

    if (!countSpan || !stackContainer) return;
    let currentCount = parseInt(countSpan.textContent) || 0;

    // 🌟 2. 【關鍵：判斷是不是點到同一個表情，進而「收回表態」】
    // 我們可以偷看目前堆疊容器裡的第一個表情是不是就是現在點的這個
    const firstEmoji = stackContainer.querySelector('.emoji-item')?.textContent;

    if (memorySet.has(id) && firstEmoji === selectedEmoji) {
        // 👉 情況 A：已經點過了，而且又按了同一個表情 ＝ 收回！
        currentCount -= 1;
        if (currentCount < 0) currentCount = 0; // 防呆
        
        countSpan.textContent = currentCount;
        memorySet.delete(id); // 從記憶庫移除（解鎖）

        // 將堆疊還原成原本最初只有一顆愛心的乾淨狀態
        stackContainer.innerHTML = `<span class="emoji-item">${heartIcon()}</span>`;
        return; // 結束函式
    } 
    
    if (memorySet.has(id) && firstEmoji !== selectedEmoji) {
        // 👉 情況 B：已經點過了，但點了「不一樣」的表情 ＝ 換心情（不加減數字）
        // 直接換掉最前面的表情即可，不需要過關
        stackContainer.innerHTML = `
            <span class="emoji-item active-pop">${selectedEmoji}</span>
            <span class="emoji-item">${heartIcon()}</span>
        `;
        return;
    }

    // 👉 情況 C：完全沒點過 ＝ 正常第一次點讚（數字 +1）
    currentCount += 1;
    countSpan.textContent = currentCount;
    memorySet.add(id); // 鎖定

    // 產生雙表情堆疊效果
    stackContainer.innerHTML = `
        <span class="emoji-item active-pop">${selectedEmoji}</span>
    `;
}

function findReviewById(reviewId) {
  const reviews = getReviewsForCourse(currentCourseId);
  return reviews.find((review) => review.id === reviewId);
}

function toggleReviewLike(reviewId) {
  if (!currentUser) {
    alert("Please login to like reviews.");
    openLoginModal();
    return;
  }

  const review = findReviewById(reviewId);
  if (!review) return;

  review.liked = !review.liked;
  review.likes += review.liked ? 1 : -1;
  loadReviews(currentCourseId);
}

function findReplyById(reviewId, replyId) {
  const review = findReviewById(reviewId);
  if (!review || !review.replies) return null;
  return review.replies.find((reply) => reply.id === replyId);
}

function toggleReplyLike(reviewId, replyId) {
  if (!currentUser) {
    alert("Please login to like replies.");
    openLoginModal();
    return;
  }

  const reply = findReplyById(reviewId, replyId);
  if (!reply) return;

  reply.liked = !reply.liked;
  reply.likes += reply.liked ? 1 : -1;
  loadReviews(currentCourseId);
}

function toggleReplyForm(reviewId) {
  if (!currentUser) {
    alert("Please login to reply.");
    openLoginModal();
    return;
  }

  const replyForm = document.getElementById(`replyForm-${reviewId}`);
  if (!replyForm) return;

  const isOpen = replyForm.style.display === "flex";
  replyForm.style.display = isOpen ? "none" : "flex";

  if (!isOpen) {
    document.getElementById(`replyInput-${reviewId}`).focus();
  }
}

function submitReply(reviewId) {
  if (!currentUser) {
    alert("Please login to reply.");
    openLoginModal();
    return;
  }

  const review = findReviewById(reviewId);
  const input = document.getElementById(`replyInput-${reviewId}`);
  if (!review || !input) return;

  const text = input.value.trim();
  if (!text) return;

  if (!review.replies) {
    review.replies = [];
  }

  review.replies.push({
    id: `reply-${Date.now()}`,
    author: getDisplayName(currentUser),
    avatar: {
      avatarAnimal: currentUser.avatarAnimal,
      gender: currentUser.gender,
    },
    date: new Date().toISOString().slice(0, 10),
    text: text,
    likes: 0,
    liked: false,
  });

  loadReviews(currentCourseId);
}

// Review form modal
function openReviewForm() {
  if (!currentUser) {
    alert("Please login to submit a review.");
    openLoginModal();
    return;
  }
  document.getElementById("reviewForm").style.display = "flex";
  selectedRating = 0;
  document.getElementById("reviewForm").reset();
  updateStarDisplay();
  document.getElementById("reviewText").focus();
}

function closeReviewModal() {
  document.getElementById("reviewForm").style.display = "none";
  document.getElementById("reviewForm").reset();
  selectedRating = 0;
  updateStarDisplay();
}

// Set rating
function setRating(rating) {
  selectedRating = rating;
  document.getElementById("ratingInput").value = rating;
  updateStarDisplay();
}

function previewRating(rating) {
  updateStarDisplay(rating);
}

function updateStarDisplay(displayRating = selectedRating) {
  const stars = document.querySelectorAll(".star-rating .star");
  stars.forEach((star, index) => {
    if (index < displayRating) {
      star.classList.add("active");
    } else {
      star.classList.remove("active");
    }
  });
}

// Submit review
function submitReview(event) {
  event.preventDefault();

  if (!currentUser) {
    alert("Please login to submit a review.");
    return;
  }

  if (selectedRating === 0) {
    alert("Please select a rating.");
    return;
  }

  const reviewText = document.getElementById("reviewText").value;
  const course = allCourses.find((c) => c.id === currentCourseId);
  const today = new Date().toISOString().slice(0, 10);
  const newReview = {
    id: `review-${Date.now()}`,
    author: getDisplayName(currentUser),
    avatar: {
      avatarAnimal: currentUser.avatarAnimal,
      gender: currentUser.gender,
    },
    rating: selectedRating,
    date: today,
    language: "English",
    text: reviewText,
    likes: 0,
    liked: false,
    replies: [],
  };

  // Mock API call
  console.log({
    courseId: currentCourseId,
    author: getDisplayName(currentUser),
    rating: selectedRating,
    text: reviewText,
    language: "English",
  });

  if (!courseReviews[currentCourseId]) {
    courseReviews[currentCourseId] = [];
  }

  courseReviews[currentCourseId].unshift(newReview);

  if (course) {
    course.reviewCount = courseReviews[currentCourseId].length;
    course.rating = getAverageRating(
      courseReviews[currentCourseId],
      course.rating,
    );
  }

  alert("Review submitted successfully!");
  closeReviewModal();

  if (currentCourseId) {
    openCourseDetail(currentCourseId);
  }
}

// Close modals when clicking outside
window.onclick = function (event) {
  const loginModal = document.getElementById("loginModal");

  if (event.target === loginModal) {
    loginModal.style.display = "none";
  }
};

// ====== 角色選擇視窗 (Role Modal) 核心控制邏輯 ======

// ====== 請將這段貼在 script.js 的最底部 ======

window.openRoleModal = function() {
    const roleModal = document.getElementById("roleModal");
    if (roleModal) roleModal.style.display = "block";
}

window.closeRoleModal = function() {
    const roleModal = document.getElementById("roleModal");
    if (roleModal) roleModal.style.display = "none";
}

window.closeRoleModalOutside = function(event) {
    const roleModal = document.getElementById("roleModal");
    if (event.target === roleModal) {
        roleModal.style.display = "none";
    }
}

// 🌟 核心修正：點擊 User 之後的行為
window.handleRoleChoice = function(role) {
    console.log("選擇登入身分為:", role);
    
    // 1. 先把角色選擇視窗關閉
    window.closeRoleModal();
    
    // 2. ⚡️ 關鍵魔法：讓瀏覽器呼吸 100 毫秒，等關閉動畫跑完，再乾乾淨淨地把藍色登入框叫醒！
    setTimeout(() => {
        if (role === 'user' || role === 'admin') {
            window.openLoginModal();
            window.setRegisterMode(false); // 確保是 Login 畫面
        }
    }, 100); 
}

// ====== 新增：在 Modal 中選好角色後的處理邏輯 ======
window.selectRole = function(role) {
    console.log("使用者選擇的角色是:", role);
    
    // 1. 把角色選擇區塊藏起來
    document.getElementById("roleSelectionSection").style.display = "none";
    
    // 2. 把你原本寫好的藍色登入表單秀出來！
    document.getElementById("actualLoginForm").style.display = "block";
    
    // 3. 呼叫你原本寫好的大腦，確保是 Login 狀態（隱藏 avatar, gender 等註冊欄位）
    window.setRegisterMode(false);
}