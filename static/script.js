// Global variables
let currentUser = null;
let currentCourseId = null;
let allCourses = [];
let currentFilteredCourses = [];
let currentPage = 1;
let courseRequestToken = 0;
let searchDebounceTimer = null;
let currentPagination = {
  page: 1,
  perPage: 20,
  total: 0,
  totalPages: 1,
};
let selectedRating = 0;
const expandedReplyGroups = new Set();
const expandedTextItems = new Set();
const TEXT_PREVIEW_LIMIT = 200;
const COURSES_PER_PAGE = 100;
let coursePagination = {
  page: 1,
  perPage: COURSES_PER_PAGE,
  total: 0,
  totalPages: 1,
};
let isLoadingCourses = false;
let pendingCourseFetchPage = null;
let notificationState = {
  activeTab: "notifications",
  items: [],
  unreadCount: 0,
};
let departmentGroups = {};
let sportActivityOptions = [];
const DEPARTMENT_SUBFILTER_GROUPS = {
  "跨院選修": (department) => department.startsWith("跨院選修"),
  "博雅": (department) => department.startsWith("博雅"),
  "跨院EAP/ESP": (department) => ["跨院EAP", "跨院ESP"].includes(department),
  "運動健康": (department) => department.startsWith("運動健康") || department.startsWith("運動進階"),
  "英文": (department) => department.startsWith("英文"),
};
const LIBERAL_ARTS_ORDER = [
  "博雅向度一",
  "博雅向度二",
  "博雅向度三",
  "博雅向度四",
  "博雅向度五",
  "博雅向度六",
];
const ENGLISH_LEVEL_ORDER = ["英文初級", "英文中級", "英文中高級", "英文高級"];

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
    saveCount: 0,
    year: 113,
    semester: 1,
    tags: ["Computer Science", "Programming", "Foundation"],
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
    saveCount: 0,
    year: 113,
    semester: 1,
    tags: ["Mathematics", "Calculus", "Workload"],
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
    saveCount: 0,
    year: 113,
    semester: 2,
    tags: ["Writing", "Research", "Feedback"],
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
    saveCount: 0,
    year: 112,
    semester: 2,
    tags: ["Physics", "Lab", "Mechanics"],
    description:
      "Mechanics, motion, forces, energy, and foundational physics models",
  },
];

const sampleReviews = {
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

const courseReviews =
  window.__INITIAL_REVIEWS__ && Object.keys(window.__INITIAL_REVIEWS__).length
    ? window.__INITIAL_REVIEWS__
    : sampleReviews;

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

function commentIcon() {
  return `
    <svg class="comment-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5a8.5 8.5 0 0 1 17 0z"></path>
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
    <svg viewBox="0 0 24 24" aria-hidden="true">
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

function reactionIcon(reaction) {
  return reaction || heartIcon();
}

function renderReactionControl(item, reviewId, replyId = null) {
  const targetArgs = replyId ? `'${reviewId}', '${replyId}'` : `'${reviewId}'`;
  const selectedReaction = item.reaction || (item.liked ? "❤️" : "");

  return `
    <div class="reaction-container" data-review-id="${reviewId}" ${replyId ? `data-reply-id="${replyId}"` : ""}>
      <button
        class="review-action-btn main-reaction-btn ${item.liked ? "liked" : ""}"
        onclick="handleQuickLike(event, ${targetArgs})"
        type="button"
      >
        <span class="emoji-stack">
          <span class="emoji-item">${reactionIcon(selectedReaction)}</span>
        </span>
        <span class="like-count-num">${item.likes ?? 0}</span>
      </button>
      <div class="reaction-palette">
        <button type="button" onclick="selectReviewEmoji(event, ${targetArgs}, '❤️')">❤️</button>
        <button type="button" onclick="selectReviewEmoji(event, ${targetArgs}, '🙂')">🙂</button>
        <button type="button" onclick="selectReviewEmoji(event, ${targetArgs}, '😮')">😮</button>
        <button type="button" onclick="selectReviewEmoji(event, ${targetArgs}, '😭')">😭</button>
        <button type="button" onclick="selectReviewEmoji(event, ${targetArgs}, '👍')">👍</button>
        <button type="button" onclick="selectReviewEmoji(event, ${targetArgs}, '🔥')">🔥</button>
      </div>
    </div>
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

function containsCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ""));
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

function isCurrentUserAdmin() {
  return currentUser?.role === "admin";
}

function getAdminCoursePayload(form) {
  const formData = new FormData(form);
  return {
    code: String(formData.get("code") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    title_zh: String(formData.get("title_zh") || "").trim(),
    professor: String(formData.get("professor") || "").trim(),
    department: String(formData.get("department") || "").trim(),
    credits: String(formData.get("credits") || "").trim(),
    year: String(formData.get("year") || "").trim(),
    semester: String(formData.get("semester") || "").trim(),
    grade: String(formData.get("grade") || "").trim(),
    requirement: String(formData.get("requirement") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    englishTaught: formData.has("english_taught"),
  };
}

function renderAdminControls() {
  const addPanel = document.getElementById("adminAddCoursePanel");
  if (addPanel) {
    addPanel.style.display = isCurrentUserAdmin() ? "block" : "none";
  }

  // Show/hide the "+" button in the page heading for admin users
  const addBtn = document.getElementById("adminAddCourseBtn");
  if (addBtn) {
    addBtn.style.display = isCurrentUserAdmin() ? "inline-flex" : "none";
  }

  // Update user menu to show admin badge if user is admin
  const userMenu = document.getElementById("userMenu");
  if (userMenu && currentUser) {
    const existingBadge = userMenu.querySelector(".admin-badge");
    if (isCurrentUserAdmin() && !existingBadge) {
      const badge = document.createElement("span");
      badge.className = "admin-badge";
      badge.textContent = "admin";
      badge.style.cssText = "font-size: 1rem; color: #ffcf76; background: rgba(255,207,118,0.2); padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 700;";
      userMenu.appendChild(badge);
    } else if (!isCurrentUserAdmin() && existingBadge) {
      existingBadge.remove();
    }
  }

  if (currentCourseId) {
    const course = allCourses.find((item) => String(item.id) === String(currentCourseId));
    renderAdminCoursePanel(course);
  }
}

function toggleAdminAddCourseForm() {
  const form = document.getElementById("adminAddCourseForm");
  const button = document.getElementById("adminAddCourseToggle");
  if (!form) return;

  const isCollapsed = form.classList.toggle("admin-course-form-collapsed");
  if (button) {
    button.textContent = isCollapsed ? "New Course" : "Close";
  }
}

// Edit admin course - shows edit panel in the All Courses page
window.editAdminCourse = function(courseId) {
  const course = allCourses.find((c) => String(c.id) === String(courseId));
  if (!course || !isCurrentUserAdmin()) return;

  // Make sure we're on the main page (not in course detail)
  if (document.body.classList.contains("detail-open")) {
    closeCourseDetail();
  }

  // Show the admin edit panel
  const panel = document.getElementById("adminEditCoursePanel");
  if (panel) {
    panel.style.display = "block";
    renderAdminCoursePanel(course);
    // Scroll to the panel
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

function renderAdminCoursePanel(course) {
  const panel = document.getElementById("adminEditCoursePanel");
  if (!panel) return;

  if (!isCurrentUserAdmin() || !course) {
    panel.style.display = "none";
    panel.innerHTML = "";
    return;
  }

  panel.style.display = "block";
  panel.innerHTML = `
    <div class="admin-course-header">
      <div>
        <h2>Edit Course</h2>
        <p class="admin-hint">Changes update this course immediately.</p>
      </div>
    </div>
    <form class="admin-course-form" id="adminEditCourseForm" data-course-id="${escapeHtml(course.id)}" onsubmit="submitAdminCourseEdit(event)">
      <div class="admin-form-row">
        <input type="text" name="code" placeholder="Course code" value="${escapeHtml(course.code || "")}" required />
        <input type="text" name="title" placeholder="Course title" value="${escapeHtml(course.title || "")}" required />
      </div>
      <div class="admin-form-row">
        <input type="text" name="title_zh" placeholder="Chinese title" value="${escapeHtml(course.titleZh || "")}" />
        <input type="text" name="professor" placeholder="Professor" value="${escapeHtml(course.professor || "")}" />
      </div>
      <div class="admin-form-row">
        <input type="text" name="department" placeholder="Department" value="${escapeHtml(course.department || "")}" />
        <input type="text" name="credits" placeholder="Credits" value="${escapeHtml(course.credits || "")}" />
      </div>
      <div class="admin-form-row">
        <input type="text" name="year" placeholder="Year" value="${escapeHtml(course.year || "")}" />
        <input type="text" name="semester" placeholder="Semester" value="${escapeHtml(course.semester || "")}" />
        <input type="text" name="grade" placeholder="Grade" value="${escapeHtml(course.grade || "")}" />
      </div>
      <div class="admin-form-row">
        <input type="text" name="requirement" placeholder="Requirement" value="${escapeHtml(course.requirement || "")}" />
        <label class="admin-checkbox-label">
          <input type="checkbox" name="english_taught" ${course.englishTaught ? "checked" : ""} /> English taught
        </label>
      </div>
      <div class="admin-form-row">
        <textarea name="description" placeholder="Description">${escapeHtml(course.description || "")}</textarea>
      </div>
      <div class="admin-course-actions">
        <button type="submit" class="btn-reviews-card">Save Changes</button>
        <button type="button" class="btn-secondary" onclick="deleteAdminCourse(${course.id})">Delete Course</button>
      </div>
    </form>
  `;
}

async function submitAdminCourseCreate(event) {
  event.preventDefault();
  try {
    const result = await apiRequest("/api/admin/courses", {
      method: "POST",
      body: JSON.stringify(getAdminCoursePayload(event.currentTarget)),
    });

    if (result.course) {
      allCourses.unshift(result.course);
      displayCourses(allCourses);
    }
    event.currentTarget.reset();
    alert("課程已成功新增。");
  } catch (error) {
    alert(error.message);
  }
}

async function submitAdminCourseEdit(event) {
  event.preventDefault();
  event.stopPropagation();
  const form = event.currentTarget;
  const courseId = form.dataset.courseId;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton?.textContent || "Save Changes";

  if (!form.reportValidity()) return;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";
  }

  try {
    const result = await apiRequest(`/api/admin/courses/${courseId}`, {
      method: "PATCH",
      body: JSON.stringify(getAdminCoursePayload(form)),
    });

    if (result.course) {
      replaceCourseInState(result.course);
      displayCourses(allCourses);
      const panel = document.getElementById("adminEditCoursePanel");
      if (panel) {
        panel.style.display = "none";
        panel.innerHTML = "";
      }
      openCourseDetail(result.course.id);
    }
    alert("課程已成功儲存。");
  } catch (error) {
    alert(error.message || "課程儲存失敗，請再試一次。");
  } finally {
    const activeForm = document.getElementById("adminEditCourseForm");
    const activeSubmitButton = activeForm?.querySelector('button[type="submit"]');
    if (activeSubmitButton) {
      activeSubmitButton.disabled = false;
      activeSubmitButton.textContent = originalButtonText;
    }
  }
}

window.submitAdminCourseEdit = submitAdminCourseEdit;

async function deleteAdminCourse(courseId) {
  if (!confirm("Delete this course?")) return;

  try {
    await apiRequest(`/api/admin/courses/${courseId}`, {
      method: "DELETE",
    });
    allCourses = allCourses.filter((course) => String(course.id) !== String(courseId));
    delete courseReviews[courseId];
    closeCourseDetail();
    displayCourses(allCourses);
    alert("課程已成功刪除。");
  } catch (error) {
    alert(error.message);
  }
}

function setupAdminForms() {
  const addForm = document.getElementById("adminAddCourseForm");
  if (addForm) {
    addForm.addEventListener("submit", submitAdminCourseCreate);
  }

  document.addEventListener("submit", (event) => {
    if (event.target?.id === "adminEditCourseForm") {
      submitAdminCourseEdit(event);
    }
  });
}

function buildNotificationItem(item) {
  const statusClass = item.isRead ? "" : "unread";
  const icon = item.category === "activity" ? "💬" : "🔔";
  const linkAttr = item.link ? `data-link="${escapeHtml(item.link)}"` : "";
  return `
    <div class="notification-item ${statusClass}" data-id="${escapeHtml(item.id)}" ${linkAttr}>
      <div class="noti-icon">${icon}</div>
      <div class="noti-content">
        <p>${escapeHtml(item.message)}</p>
        <span class="noti-time">${escapeHtml(item.createdAt)}</span>
      </div>
    </div>
  `;
}

function renderNotificationList() {
  const list = document.getElementById("notificationList");
  const empty = document.getElementById("notificationEmpty");
  if (!list || !empty) return;

  const items = notificationState.items || [];
  const filteredItems = notificationState.activeTab === "activity"
    ? items.filter((item) => item.category === "activity")
    : items.filter((item) => item.category !== "activity" && !item.isRead);

  list.innerHTML = filteredItems.length ? filteredItems.map(buildNotificationItem).join("") : "";
  empty.textContent = notificationState.activeTab === "activity"
    ? "No activity yet."
    : "No notifications yet.";
  empty.style.display = filteredItems.length ? "none" : "block";
}

function updateNotificationBadge() {
  const badge = document.getElementById("notiBadge");
  if (!badge) return;
  badge.textContent = notificationState.unreadCount || "";
  badge.style.display = notificationState.unreadCount ? "flex" : "none";
}

function switchNotificationTab(tab) {
  notificationState.activeTab = tab;
  document.querySelectorAll(".notification-tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  renderNotificationList();
}

async function refreshNotifications() {
  if (!currentUser) return;
  try {
    const data = await apiRequest("/api/notifications");
    notificationState.items = data.notifications || [];
    notificationState.unreadCount = data.unreadCount || 0;
    updateNotificationBadge();
    if (document.getElementById("notificationDropdown")?.style.display === "block") {
      renderNotificationList();
    }
    if (document.getElementById("activityPage")?.style.display === "block") {
      renderActivityList();
    }
  } catch (error) {
    console.warn("Failed to refresh notifications:", error);
  }
}


async function markAllAsRead() {
  if (!currentUser) return;
  try {
    await apiRequest("/api/notifications/mark_read", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await refreshNotifications();
  } catch (error) {
    console.warn("Failed to mark notifications read:", error);
  }
}

function startNotificationPolling() {
  setInterval(() => {
    if (currentUser) {
      refreshNotifications();
    }
  }, 15000);
}

function renderExpandableText(text, key, className) {
  const value = String(text || "");
  const firstSentence = getFirstSentence(value);
  const isLong = value.trim().length > TEXT_PREVIEW_LIMIT;
  const isExpanded = expandedTextItems.has(key);
  const visibleText = isLong && !isExpanded ? firstSentence : value;
  const toggle = isLong
    ? ` <button class="read-more-btn" type="button" onclick="toggleExpandedText(event, '${key}')">${isExpanded ? "Read less" : "Read more"}</button>`
    : "";

  return `<p class="${className}">${escapeHtml(visibleText)}${toggle}</p>`;
}

function getFirstSentence(value) {
  const text = String(value || "").trim();
  const match = text.match(/^.*?[.!?。！？](?=\s|$)/);
  if (match) return match[0].trim();

  return text.length > TEXT_PREVIEW_LIMIT
    ? `${text.slice(0, TEXT_PREVIEW_LIMIT).trim()}...`
    : text;
}

function toggleExpandedText(event, key) {
  event.stopPropagation();
  if (expandedTextItems.has(key)) {
    expandedTextItems.delete(key);
  } else {
    expandedTextItems.add(key);
  }
  loadReviews(currentCourseId);
}

// Initialize the page
document.addEventListener("DOMContentLoaded", function () {
  departmentGroups = window.__DEPARTMENT_GROUPS__ || {};
  sportActivityOptions = window.__SPORT_ACTIVITY_OPTIONS__ || [];
  displayCourses([], "Loading courses...");
  loadCoursesFromApi({ page: 1 });
  loadFilterOptions();
  renderCategoryFilter();
  setupEventListeners();
  setupAdminForms();
  checkUserLogin();
  renderAdminControls();
  refreshNotifications();
  startNotificationPolling();
});

function getDepartmentsForCategory(category) {
  if (!category) {
    return [];
  }

  return (departmentGroups[category] || []).map((item) => item.name || item);
}

function getDepartmentsForGroup(groupName) {
  const matcher = DEPARTMENT_SUBFILTER_GROUPS[groupName];
  if (!matcher) return [];

  const departments = Object.values(departmentGroups)
    .flat()
    .map((item) => item.name || item)
    .filter((department) => matcher(department));

  if (groupName === "博雅") {
    return [...departments].sort((a, b) => {
      const indexA = LIBERAL_ARTS_ORDER.indexOf(a);
      const indexB = LIBERAL_ARTS_ORDER.indexOf(b);
      return (
        (indexA === -1 ? LIBERAL_ARTS_ORDER.length : indexA) -
        (indexB === -1 ? LIBERAL_ARTS_ORDER.length : indexB)
      ) || a.localeCompare(b, "zh-Hant");
    });
  }

  if (groupName === "英文") {
    return [...departments].sort((a, b) => {
      const indexA = ENGLISH_LEVEL_ORDER.indexOf(a);
      const indexB = ENGLISH_LEVEL_ORDER.indexOf(b);
      return (
        (indexA === -1 ? ENGLISH_LEVEL_ORDER.length : indexA) -
        (indexB === -1 ? ENGLISH_LEVEL_ORDER.length : indexB)
      ) || a.localeCompare(b, "zh-Hant");
    });
  }

  return departments;
}

function getDepartmentCategory(department) {
  return Object.entries(departmentGroups).find(([, departments]) =>
    departments.some((item) => (item.name || item) === department)
  )?.[0] || "";
}

// ── Category filter (top row) ─────────────────────────────────────────────
function renderCategoryFilter() {
  const row = document.getElementById("deptCategoryFilterRow");
  if (!row) return;

  const categories = Object.keys(departmentGroups);

  // Build buttons
  row.innerHTML =
    `<span class="filter-label">Category │</span>` +
    `<button type="button" class="filter-tag-btn active" data-value="">All</button>` +
    categories
      .map(
        (cat) =>
          `<button type="button" class="filter-tag-btn" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
      )
      .join("");

  // Bind events
  row.querySelectorAll(".filter-tag-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      row.querySelectorAll(".filter-tag-btn").forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      renderDepartmentFilter(this.dataset.value || "");
      loadCoursesFromApi({ page: 1 });
    });
  });
}

// ── Department filter (second row) ───────────────────────────────────────
function renderDepartmentFilter(category) {
  const row = document.getElementById("deptFilterRow");
  if (!row) return;

  const options = getDepartmentFilterOptions(category);

  // Hide dept row when no category is selected or there are no options
  if (!category || options.length === 0) {
    row.style.display = "none";
    row.innerHTML = `<span class="filter-label">Department │</span>
      <button type="button" class="filter-tag-btn active" data-value="">All</button>`;
    return;
  }

  row.innerHTML =
    `<span class="filter-label">Department │</span>` +
    `<button type="button" class="filter-tag-btn active" data-value="">All</button>` +
    options
      .map(
        (opt) =>
          `<button type="button" class="filter-tag-btn"
            data-value="${escapeHtml(opt.value || "")}"
            data-group="${escapeHtml(opt.group || "")}"
            data-label="${escapeHtml(opt.label)}"
          >${escapeHtml(opt.label)}</button>`
      )
      .join("");

  row.style.display = "";
  attachDepartmentButtonEvents(row);
}

function attachDepartmentButtonEvents(row) {
  row.querySelectorAll(".filter-tag-btn").forEach((button) => {
    bindDepartmentButton(button);
  });
}

function bindDepartmentButton(button) {
  if (!button || button.dataset.bound === "true") return;

  button.dataset.bound = "true";
  button.addEventListener("click", function () {
    const row = this.closest("#deptFilterRow");

    // If clicking "All", restore any open subfilter select first
    restoreDepartmentSubfilter(row);
    row.querySelectorAll(".filter-tag-btn").forEach((item) => item.classList.remove("active"));
    this.classList.add("active");

    // Group button → replace itself with a <select> dropdown
    if (this.dataset.group) {
      renderDepartmentSubFilter(this.dataset.group, this);
    }

    loadCoursesFromApi({ page: 1 });
  });
}

// Render a <select> in place of a group button
function renderDepartmentSubFilter(groupName, targetButton) {
  if (!groupName || !targetButton) return;

  const subOptions =
    groupName === "運動健康"
      ? sportActivityOptions
      : getDepartmentsForGroup(groupName);

  const optionsHtml = subOptions
    .map((val) => `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`)
    .join("");

  const select = document.createElement("select");
  select.className = "department-subfilter-select";
  select.id = "deptSubFilterSelect";
  select.dataset.group = groupName;
  select.dataset.label = targetButton.dataset.label || groupName;
  select.innerHTML = `<option value="">${escapeHtml(groupName)}: All</option>${optionsHtml}`;
  select.value = "";
  select.addEventListener("change", () => loadCoursesFromApi({ page: 1 }));

  targetButton.replaceWith(select);
  select.focus();
}

// Restore the <select> back to a plain button
function restoreDepartmentSubfilter(row) {
  const select = row ? row.querySelector("#deptSubFilterSelect") : document.getElementById("deptSubFilterSelect");
  if (!select) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter-tag-btn";
  button.dataset.value = "";
  button.dataset.group = select.dataset.group || "";
  button.dataset.label = select.dataset.label || select.dataset.group || "";
  button.textContent = button.dataset.label;
  select.replaceWith(button);
  bindDepartmentButton(button);
}

function getDepartmentFilterOptions(category) {
  const departments = getDepartmentsForCategory(category);
  if (!category) return [];

  if (category === "通識") {
    const groupNames = ["跨院選修", "博雅", "跨院EAP/ESP", "運動健康", "英文"];
    const grouped = new Set(
      groupNames.flatMap((groupName) => getDepartmentsForGroup(groupName))
    );
    const directDepartments = departments
      .filter((department) => !grouped.has(department))
      .map((department) => ({
        label: department,
        value: department,
      }));

    return [
      ...groupNames.map((groupName) => ({
        label: groupName,
        group: groupName,
      })),
      ...directDepartments,
    ];
  }

  if (category === "校際") {
    return [
      { label: "大學部", value: "校際(學士班)" },
      { label: "研究所", value: "校際(研究所)" },
    ];
  }

  return departments.map((department) => ({
    label: department,
    value: department,
  }));
}

function getCourseRequestParams(page = 1) {
  const params = new URLSearchParams();
  const searchBox = document.getElementById("searchBox");
  const yearActiveBtn = document.querySelector("#yearFilterRow .filter-tag-btn.active");
  const deptCategoryActiveBtn = document.querySelector("#deptCategoryFilterRow .filter-tag-btn.active");
  const deptActiveBtn = document.querySelector("#deptFilterRow .filter-tag-btn.active");
  const deptSubFilterSelect = document.getElementById("deptSubFilterSelect");
  const ratingActiveBtn = document.querySelector("#ratingFilterRow .filter-tag-btn.active");
  const semActiveBtn = document.querySelector("#semesterFilterRow .filter-tag-btn.active");
  const sortActiveBtn = document.querySelector(".sort-text-btn.active");

  const searchTerm = searchBox ? searchBox.value.trim() : "";
  const year = yearActiveBtn ? yearActiveBtn.dataset.value : "";
  const departmentCategory = deptCategoryActiveBtn ? deptCategoryActiveBtn.dataset.value : "";
  const departmentGroup = deptSubFilterSelect?.dataset.group || deptActiveBtn?.dataset.group || "";
  const selectedSubDept = deptSubFilterSelect?.value || "";
  const department = departmentGroup && departmentGroup !== "運動健康"
    ? selectedSubDept
    : deptActiveBtn?.dataset.value || "";
  const sportActivity = departmentGroup === "運動健康" ? selectedSubDept : "";
  const minRating = ratingActiveBtn ? ratingActiveBtn.dataset.value : "";
  const semester = semActiveBtn ? semActiveBtn.dataset.value : "";
  const sortBy = sortActiveBtn ? (sortActiveBtn.dataset.sort || sortActiveBtn.dataset.value) : "popular";

  params.set("page", String(page));
  params.set("per_page", String(COURSES_PER_PAGE));
  params.set("sort", sortBy);
  if (searchTerm) params.set("q", searchTerm);
  if (year) params.set("year", year);
  if (departmentCategory) params.set("department_category", departmentCategory);
  if (departmentGroup) params.set("department_group", departmentGroup);
  if (department) params.set("department", department);
  if (sportActivity) params.set("sport_activity", sportActivity);
  if (minRating) params.set("min_rating", minRating);
  if (semester) params.set("semester", semester);
  return params;
}

async function loadCoursesFromApi({ page = 1 } = {}) {
  return fetchCoursesPage(page);
}

async function loadFilterOptions() {
  try {
    const response = await fetch("/api/filter-options");
    if (!response.ok) return;

    const options = await response.json();
    // Update departmentGroups if the API returns them
    if (options.department_groups) {
      departmentGroups = options.department_groups;
      renderCategoryFilter();
    }
    renderFilterRow("yearFilterRow", "Year", options.years || [], (year) => String(year));
    renderFilterRow(
      "semesterFilterRow",
      "Semester",
      options.semesters || [],
      (term) => (Number(term) === 3 ? "Summer Vacation" : `S${term}`),
    );
    renderDepartmentFilter("");
  } catch (error) {
    console.warn("Using static filter options because the filter API is unavailable.", error);
  }
}

function renderFilterRow(rowId, label, values, getLabel) {
  const row = document.getElementById(rowId);
  if (!row) return;

  row.innerHTML = "";

  const labelEl = document.createElement("span");
  labelEl.className = "filter-label";
  labelEl.textContent = `${label} \u2502`;
  row.appendChild(labelEl);

  const allButton = createFilterButton("All", "");
  allButton.classList.add("active");
  row.appendChild(allButton);

  values.forEach((value) => {
    const button = createFilterButton(getLabel(value), value);
    row.appendChild(button);
  });
}

function renderDepartmentFilterRow(rowId, label, values, getLabel) {
  const row = document.getElementById(rowId);
  if (!row) return;

  row.innerHTML = "";

  const labelEl = document.createElement("span");
  labelEl.className = "filter-label";
  labelEl.textContent = `${label} \u2502`;
  row.appendChild(labelEl);

  const allButton = createFilterButton("All", "");
  allButton.classList.add("active");
  row.appendChild(allButton);

  values.forEach((value) => {
    row.appendChild(createFilterButton(getLabel(value), value));
  });
}

function createFilterButton(label, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter-tag-btn";
  button.dataset.value = String(value);
  button.textContent = label;
  button.addEventListener("click", function () {
    activateFilterButton(button);
  });
  return button;
}

function activateFilterButton(button) {
  const row = button.closest(".filter-row");
  if (!row) return;

  const buttons = row.querySelectorAll(".filter-tag-btn");
  const allButton = row.querySelector('.filter-tag-btn[data-value=""]');
  const shouldResetToAll = button.classList.contains("active") && button.dataset.value !== "";
  const nextActiveButton = shouldResetToAll && allButton ? allButton : button;

  buttons.forEach((btn) => {
    btn.classList.remove("active");
  });
  nextActiveButton.classList.add("active");
  filterCourses();
}



// 請將 setupEventListeners() 的前半段修改成這樣：
function setupEventListeners() {
  const safeAddListener = (id, eventType, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(eventType, handler);
  };

  // 1. 對接你 HTML 原有的 userAvatar 與 userDropdown (使用 hidden 屬性切換)
  const userAvatar = document.getElementById("userAvatar");
  if (userAvatar) {
    userAvatar.addEventListener("click", function (e) {
      e.stopPropagation();
      if (currentUser) {
        const menu = document.getElementById("userDropdown");
        if (menu) {
          // 因為你的 HTML 是用 hidden 屬性，這裡直接切換 true/false 即可
          menu.hidden = !menu.hidden;
        }
      } else {
        openLoginModal();
      }
    });
  }

  // 點擊網頁任意地方，自動收起下拉選單
  document.addEventListener("click", function () {
    const menu = document.getElementById("userDropdown");
    if (menu) menu.hidden = true;
  });

  // 2. 精準綁定你 HTML 裡面原本就有的選單按鈕 ID
  safeAddListener("profileMenuBtn", "click", openProfileModal);
  safeAddListener("favoritesMenuBtn", "click", showFavorites);
  safeAddListener("activityMenuBtn", "click", function () {
    showActivity();
  });
  safeAddListener("signOutMenuBtn", "click", logout);
  
  safeAddListener("loginBtn", "click", openLoginModal);
  safeAddListener("logoutBtn", "click", logout);

  // 表單與搜尋事件 (維持不變)
  safeAddListener("authForm", "submit", login);
  safeAddListener("avatarAnimal", "change", updateAvatarPreview);
  safeAddListener("gender", "change", updateAvatarPreview);
  safeAddListener("searchBox", "input", queueCourseSearch);

  // ✅ 全新：補上個人資料 (Profile) 專屬的頭像切換事件
  safeAddListener("profileAvatarAnimal", "change", updateProfileAvatarPreview);
  safeAddListener("profileGender", "change", updateProfileAvatarPreview);

  // 3. 橫向篩選按鈕列事件（year/rating 等靜態列；category 由 renderCategoryFilter 動態處理）
const filterRows = ['ratingFilterRow'];

filterRows.forEach(rowId => {
  const row = document.getElementById(rowId);
  if (!row) return;
  const buttons = row.querySelectorAll('.filter-tag-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', function () {
      
      // 1. 💡 如果點的是大類別（如：通識），先觸發你的設計，讓下方生出對應的系所按鈕
      if (rowId === "deptCategoryFilterRow") {
        renderDepartmentFilter(this.dataset.value || "");
      }

      // 2. 執行後端寫的按鈕切換（內部包含處理 active 樣式與防呆機制）
      activateFilterButton(this);

      // 3. 既然篩選條件變了，就叫後端 API 重新向資料庫抓第一頁的資料
      if (typeof loadCoursesFromApi === "function") {
        loadCoursesFromApi({ page: 1 });
      }
    });
  });
});

  // === 全新：熱門搜尋面板連動邏輯 ===
  const searchBox = document.getElementById("searchBox");
  const searchDropdown = document.getElementById("searchDropdownCard");

  if (searchBox && searchDropdown) {
    // 1. 當點擊(聚焦)搜尋框時，展開熱門搜尋面板
    searchBox.addEventListener("focus", function() {
      searchDropdown.style.display = "block";
    });

    // 2. 點擊網頁其他地方時，自動收起面板
    document.addEventListener("click", function(e) {
      if (!searchBox.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = "none";
      }
    });

    // 3. 點擊熱門標籤時，自動填入搜尋框並立刻篩選！
    const trendingBtns = searchDropdown.querySelectorAll(".trending-tag-btn");
    
    trendingBtns.forEach(btn => {
      // 💡 關鍵修正：把 "click" 換成 "mousedown"
      btn.addEventListener("mousedown", function(e) {
        e.preventDefault(); // 終極防護：防止搜尋框失去焦點，面板就不會提早關閉
        
        searchBox.value = this.textContent.trim(); // 把按鈕上的字精準塞進輸入框
        searchDropdown.style.display = "none";     // 點完後乖乖把面板收起來
        filterCourses();                           // 立刻觸發底下的課程卡片重新過濾！
      });
    });
  }

  // === 全新：通知鈴鐺點擊邏輯 ===
  const notiBtn = document.getElementById("notificationBtn");
  const notiDropdown = document.getElementById("notificationDropdown");

  if (notiBtn && notiDropdown) {
    // 點鈴鐺開關卡片
    notiBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = notiDropdown.style.display === "block";
      notiDropdown.style.display = isOpen ? "none" : "block";
      if (!isOpen) {
        refreshNotifications();
      }
    });

    // 點擊網頁其他地方收起卡片
    document.addEventListener("click", function (e) {
      if (!notiBtn.contains(e.target) && !notiDropdown.contains(e.target)) {
        notiDropdown.style.display = "none";
      }
    });
    notiDropdown.addEventListener("click", async function (e) {
      const item = e.target.closest(".notification-item");
      if (!item) return;

      e.preventDefault();
      e.stopPropagation();

      const link = item.dataset.link;
      const notiId = String(item.dataset.id);
      const index = notificationState.items.findIndex((n) => String(n.id) === notiId);

      if (index !== -1) {
        const wasUnread = !notificationState.items[index].isRead;
        notificationState.items[index].isRead = true;
        notificationState.unreadCount = Math.max(0, notificationState.unreadCount - 1);
        updateNotificationBadge();

        // 先從畫面上隱藏已讀通知
        notificationState.items.splice(index, 1);
        renderNotificationList();
      }

      notiDropdown.style.display = "none";

      apiRequest("/api/notifications/mark_read", {
        method: "POST",
        body: JSON.stringify({ ids: [notiId] }),
      }).catch((error) => {
        console.warn("Failed to mark notification read:", error);
      });

      if (link) {
        const courseMatch = String(link).match(/\/courses\/(\d+)/);
        if (courseMatch && typeof openCourseDetail === "function") {
          const courseId = Number(courseMatch[1]);
          if (!Number.isNaN(courseId)) {
            openCourseDetail(courseId);
            return;
          }
        }
        window.location.href = link;
      }
    });
  }
    document.querySelectorAll(".notification-tab-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        switchNotificationTab(this.dataset.tab);
      });
    });
}

// Display courses
function displayCourses(courses, emptyText = "No courses found.", options = {}) {
  const container = document.getElementById("coursesContainer");
  if (options.pagination) {
    coursePagination = {
      ...coursePagination,
      ...options.pagination,
    };
  }
  renderCourseCards(container, courses, emptyText);
  renderCoursePagination();
}

function getActiveCourseFilters() {
  const searchTerm = document.getElementById("searchBox")?.value.trim() || "";
  const yearActiveBtn = document.querySelector("#yearFilterRow .filter-tag-btn.active");
  const deptCategoryActiveBtn = document.querySelector("#deptCategoryFilterRow .filter-tag-btn.active");
  const deptActiveBtn = document.querySelector("#deptFilterRow .filter-tag-btn.active");
  const ratingActiveBtn = document.querySelector("#ratingFilterRow .filter-tag-btn.active");
  const semActiveBtn = document.querySelector("#semesterFilterRow .filter-tag-btn.active");
  const sortActiveBtn = document.querySelector("#quickSortMenu .sort-text-btn.active");
  const selectedDepartmentGroup = deptActiveBtn?.dataset.group || "";
  const selectedDepartment = selectedDepartmentGroup ? "" : (deptActiveBtn?.dataset.value || "");

  return {
    q: searchTerm,
    year: yearActiveBtn?.dataset.value || "",
    department_category: deptCategoryActiveBtn?.dataset.value || "",
    department_group: selectedDepartmentGroup,
    department: selectedDepartment,
    sport_activity: "",
    min_rating: ratingActiveBtn?.dataset.value || "",
    semester: semActiveBtn?.dataset.value || "",
    sort: sortActiveBtn ? (sortActiveBtn.dataset.sort || sortActiveBtn.dataset.value) : "popular",
  };
}

function buildCoursePageUrl(page = 1) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(COURSES_PER_PAGE),
  });

  Object.entries(getActiveCourseFilters()).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  return `/api/courses?${params.toString()}`;
}

async function fetchCoursesPage(page = 1) {
  const requestToken = ++courseRequestToken;
  if (isLoadingCourses) {
    pendingCourseFetchPage = page;
    return;
  }
  isLoadingCourses = true;
  const container = document.getElementById("coursesContainer");
  if (container) {
    container.innerHTML = '<p class="empty-state">Loading courses...</p>';
  }

  try {
    const data = await apiRequest(buildCoursePageUrl(page));
    if (requestToken !== courseRequestToken) return;
    allCourses = data.courses || [];
    Object.keys(courseReviews).forEach((courseId) => {
      if (!allCourses.some((course) => String(course.id) === String(courseId))) {
        delete courseReviews[courseId];
      }
    });
    Object.assign(courseReviews, data.reviews || {});
    coursePagination = {
      ...coursePagination,
      ...(data.pagination || {}),
    };
    displayCourses(allCourses);
    if (typeof generateDynamicTrending === "function") {
      generateDynamicTrending();
    }
  } catch (error) {
    if (requestToken !== courseRequestToken) return;
    if (container) {
      container.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    }
  } finally {
    isLoadingCourses = false;
    if (pendingCourseFetchPage !== null) {
      const nextPage = pendingCourseFetchPage;
      pendingCourseFetchPage = null;
      fetchCoursesPage(nextPage);
    }
  }
}

function getPaginationPages(page, totalPages) {
  const pages = new Set([1, totalPages]);
  for (let value = page - 2; value <= page + 2; value += 1) {
    if (value >= 1 && value <= totalPages) pages.add(value);
  }
  return [...pages].sort((a, b) => a - b);
}

function renderCoursePagination() {
  const pagination = document.getElementById("coursesPagination");
  if (!pagination) return;

  const totalPages = coursePagination.totalPages || 1;
  const currentPage = coursePagination.page || 1;
  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  const pages = getPaginationPages(currentPage, totalPages);
  let previousPage = 0;
  const pageButtons = pages
    .map((page) => {
      const gap = page - previousPage > 1 ? '<span class="pagination-ellipsis">...</span>' : "";
      previousPage = page;
      return `
        ${gap}
        <button
          type="button"
          class="pagination-btn ${page === currentPage ? "active" : ""}"
          onclick="goToCoursePage(${page})"
          aria-label="Go to page ${page}"
          ${page === currentPage ? 'aria-current="page"' : ""}
        >
          ${page}
        </button>
      `;
    })
    .join("");

  pagination.innerHTML = `
    <button
      type="button"
      class="pagination-btn pagination-step"
      onclick="goToCoursePage(${Math.max(1, currentPage - 1)})"
      ${currentPage === 1 ? "disabled" : ""}
    >
      Prev
    </button>
    ${pageButtons}
    <button
      type="button"
      class="pagination-btn pagination-step"
      onclick="goToCoursePage(${Math.min(totalPages, currentPage + 1)})"
      ${currentPage === totalPages ? "disabled" : ""}
    >
      Next
    </button>
    <span class="pagination-summary">
      Page ${currentPage} of ${totalPages}
    </span>
  `;
}

function goToCoursePage(page) {
  fetchCoursesPage(page);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCourseCards(container, courses, emptyText) {

  container.innerHTML = "";

  if (courses.length === 0) {
    container.innerHTML = `<p class="empty-state">${emptyText}</p>`;
    return;
  }

  courses.forEach((course) => {
    const courseCard = document.createElement("div");
    courseCard.className = `course-card ${isCurrentUserAdmin() ? "admin-course-card" : ""}`.trim();
    courseCard.onclick = () => openCourseDetail(course.id);

    const semesterText = `${course.year} S${course.semester}`;
    const showProfessor = Boolean(course.professor);
    const professorLine = showProfessor
      ? `<div class="course-professor-name">${escapeHtml(course.professor)}</div>`
      : "";
    const titlePartsBelongTogether =
      course.titleZh && !containsCjk(course.titleZh) && !containsCjk(course.title);
    const displayTitle = titlePartsBelongTogether
      ? `${course.title} ${course.titleZh}`
      : course.title;
    const subtitleLine =
      course.titleZh && !titlePartsBelongTogether
        ? `<div class="course-title-zh">${escapeHtml(course.titleZh)}</div>`
        : "";

    // Admin action buttons (edit and delete) - only show for admin users
    const adminActionsHtml = isCurrentUserAdmin() ? `
      <div class="course-admin-actions" onclick="event.stopPropagation();">
        <button class="admin-action-btn" onclick="event.stopPropagation(); editAdminCourse(${course.id})" title="Edit course" aria-label="Edit course">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="admin-action-btn admin-delete-btn" onclick="event.stopPropagation(); deleteAdminCourse(${course.id})" title="Delete course" aria-label="Delete course">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    ` : "";

    courseCard.innerHTML = `
            <div class="course-card-header">
                <div class="course-card-tags">
                  ${tagSearchButton(course.code, "course-code course-tag-btn")}
                  ${tagSearchButton(semesterText, "course-semester course-tag-btn")}
                  <div class="course-latest-offered">Latest offered: ${semesterText}</div>

                </div>
                <button
                  class="course-follow-btn ${course.followed ? "followed" : ""}"
                  onclick="event.stopPropagation(); toggleFollow(${course.id})"
                  aria-label="${course.followed ? "Unfollow course" : "Follow course"}"
                  title="${course.followed ? "Saved" : "Save course"}"
                >
                  ${heartIcon()}
                </button>
            </div>
            
            <div class="course-title-section">
                <div class="course-title-copy">
                  <div class="course-title">${escapeHtml(displayTitle)}</div>
                  ${subtitleLine}
                  ${professorLine}
                </div>
                <div class="course-rating-inline">${starIcon()}${course.rating.toFixed(1)}</div>
            </div>
            
            <div class="course-divider"></div>
            
            <div class="course-footer" onclick="event.stopPropagation();">
                <div class="course-reviews-count">
                    <span class="stat-save-display">${heartIcon()} <span id="save-count-${course.id}">${course.saveCount || 0}</span></span>
                    <span class="stat-comment">${commentIcon()} ${getCourseCommentTotal(course.id)}</span>
                </div>
                <div class="course-footer-actions">
                  <button class="btn-reviews-card" onclick="event.stopPropagation(); openCourseReviewForm(${course.id})">Add Review</button>
                </div>
            </div>
            ${adminActionsHtml}
        `;

    container.appendChild(courseCard);
  });
}

// Filter courses based on search and filters
function filterCourses() {
  fetchCoursesPage(1);
}

function searchByTag(tag) {
  const searchBox = document.getElementById("searchBox");
  const value = String(tag || "").trim();
  if (!searchBox || !value) return;

  searchBox.value = value;
  if (document.body.classList.contains("detail-open")) {
    closeCourseDetail();
  }
  filterCourses();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function tagSearchButton(tag, className) {
  const safeTag = escapeHtml(tag);
  const encodedTag = encodeURIComponent(String(tag || ""));
  return `<button type="button" class="${className}" onclick="event.stopPropagation(); searchByTag(decodeURIComponent('${encodedTag}'))">${safeTag}</button>`;
}

function queueCourseSearch() {
  window.clearTimeout(searchDebounceTimer);
  searchDebounceTimer = window.setTimeout(() => {
    filterCourses();
  }, 250);
}

// 綁定「人氣 | 最新 | 評分」按鈕的點擊切換事件
document.addEventListener("DOMContentLoaded", function() {
  const sortBtns = document.querySelectorAll('.sort-text-btn');
  sortBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // 把所有按鈕的 active 拔掉
      sortBtns.forEach(b => b.classList.remove('active'));
      // 幫目前點擊的按鈕加上 active
      e.target.classList.add('active');
      // 觸發重新排序與渲染
      filterCourses();
    });
  });
});

// Toggle follow
async function toggleFollow(courseId) {
  if (!currentUser) {
    alert("Please login to save courses.");
    openLoginModal();
    return;
  }

  const course = allCourses.find((c) => c.id === courseId);
  if (!course) return;

  try {
    const data = await apiRequest(`/api/courses/${courseId}/favorite`, {
      method: "POST",
    });
    course.followed = Boolean(data.followed);
    course.saveCount = data.saveCount || 0;
  } catch (error) {
    alert(error.message);
    if (error.message.toLowerCase().includes("authentication")) {
      openLoginModal();
    }
    return;
  }

  const countSpan = document.getElementById(`save-count-${courseId}`);
  if (countSpan) {
    countSpan.textContent = course.saveCount || 0;
  }
  syncDetailFollowButton(courseId);
  updateDetailSocialStats(courseId);
  if (document.getElementById("favoritesPage").style.display === "block") {
    renderFavorites();
  } else {
    displayCourses(allCourses);
  }
}

function getCourseSaveTotal(courseId) {
  const course = allCourses.find((entry) => entry.id === courseId);
  return course ? Number(course.saveCount || 0) : 0;
}

function syncDetailFollowButton(courseId) {
  const detailFollowBtn = document.getElementById("detailFollowBtn");
  const course = allCourses.find((c) => c.id === courseId);
  if (!detailFollowBtn || !course) return;

  detailFollowBtn.className = `course-follow-btn detail-follow-btn ${course.followed ? "followed" : ""}`;
  detailFollowBtn.innerHTML = heartIcon();
  detailFollowBtn.setAttribute(
    "aria-label",
    course.followed ? "Unsave course" : "Save course",
  );
  detailFollowBtn.title = course.followed ? "Saved" : "Save course";
  detailFollowBtn.onclick = (event) => {
    event.stopPropagation();
    toggleFollow(courseId);
  };
}

function renderDetailTags(course) {
  const tagList = document.getElementById("detailTagList");
  if (!tagList) return;

  const tags = course.tags?.length
    ? course.tags
    : [course.department, `${course.year} S${course.semester}`];
  tagList.innerHTML = tags
    .map((tag) => tagSearchButton(tag, "detail-tag-chip detail-tag-btn"))
    .join("");
}

function getCourseCommentTotal(courseId) {
  const course = allCourses.find((entry) => entry.id === courseId);
  if (course && Number.isFinite(Number(course.reviewCount))) {
    return Number(course.reviewCount);
  }

  const reviews = getReviewsForCourse(courseId);
  return reviews.reduce(
    (total, review) => total + 1 + (review.replies || []).length,
    0,
  );
}

function updateDetailSocialStats(courseId) {
  const stats = document.getElementById("detailCourseSocialStats");
  if (!stats) return;

  stats.innerHTML = `
    <span class="detail-social-stat stat-save-display">
      ${heartIcon()} <span>${getCourseSaveTotal(courseId)}</span>
    </span>
    <span class="detail-social-stat stat-comment">
      ${commentIcon()} <span>${getCourseCommentTotal(courseId)}</span>
    </span>
  `;
}

function showFavorites() {
  if (!currentUser) {
    alert("Please login to view favorites.");
    openLoginModal();
    return;
  }

  document.getElementById("pageHeading").style.display = "none";
  
  // 🔴 修正：在收藏頁面也把主頁的選單藏起來
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "none";
  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";

  document.getElementById("coursesContainer").style.display = "none";
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "none";
  document.getElementById("courseDetailPage").style.display = "none";
  document.getElementById("activityPage").style.display = "none";
  document.getElementById("favoritesPage").style.display = "block";
  renderFavorites();
}

function showActivity() {
  if (!currentUser) {
    alert("Please login to view activity.");
    openLoginModal();
    return;
  }

  document.getElementById("pageHeading").style.display = "none";
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "none";
  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";

  document.getElementById("coursesContainer").style.display = "none";
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "none";
  document.getElementById("courseDetailPage").style.display = "none";
  document.getElementById("favoritesPage").style.display = "none";
  document.getElementById("activityPage").style.display = "block";

  refreshNotifications();
  renderActivityList();
}

function renderActivityList() {
  const list = document.getElementById("activityList");
  const empty = document.getElementById("activityEmpty");
  if (!list || !empty) return;

  const items = (notificationState.items || []).filter((item) => item.category === "activity");
  list.innerHTML = items.length ? items.map(buildNotificationItem).join("") : "";
  empty.style.display = items.length ? "none" : "flex";
}

function showBrowseCourses() {
  document.getElementById("favoritesPage").style.display = "none";
  document.getElementById("activityPage").style.display = "none";
  document.getElementById("courseDetailPage").style.display = "none";
  document.getElementById("pageHeading").style.display = "";
  
  // 🟢 修正：回到主頁時，再次把選單顯示出來
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "";
  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "";

  document.getElementById("coursesContainer").style.display = "";
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "";
  filterCourses();
}

function toggleUserMenu(event) {
  event.stopPropagation();
  if (!currentUser) {
    openLoginModal();
    return;
  }

  const dropdown = document.getElementById("userDropdown");
  dropdown.hidden = !dropdown.hidden;
}

function closeUserMenu() {
  const dropdown = document.getElementById("userDropdown");
  if (dropdown) dropdown.hidden = true;
}

function closeUserMenuOnOutsideClick(event) {
  const userMenu = document.getElementById("userMenu");
  if (!userMenu || userMenu.contains(event.target)) return;
  closeUserMenu();
}

function closeMenusOnEscape(event) {
  if (event.key !== "Escape") return;
  closeUserMenu();
  closeProfileModal();
}

function updateProfileAvatarPreview() {
  const preview = document.getElementById("profileAvatarPreview");
  const profile = {
    avatarAnimal: document.getElementById("profileAvatarAnimal").value,
    gender: document.getElementById("profileGender").value,
  };

  preview.className = `avatar-preview ${getGenderClass(profile.gender)}`;
  preview.innerHTML = avatarIcon(profile);
}

function openProfileModal() {
  closeUserMenu();
  if (!currentUser) {
    openLoginModal();
    return;
  }

  document.getElementById("profileUsername").value =
    getDisplayName(currentUser) || "";
  document.getElementById("profileEmail").value = currentUser.email || "";
  document.getElementById("profileAvatarAnimal").value =
    currentUser.avatarAnimal || "question";
  document.getElementById("profileGender").value =
    currentUser.gender || "undisclosed";
  updateProfileAvatarPreview();
  document.getElementById("profileModal").style.display = "block";
}

function closeProfileModal() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.style.display = "none";
}

async function saveProfile(event) {
  event.preventDefault();
  if (!currentUser) {
    openLoginModal();
    return;
  }

  const previousUsername = getDisplayName(currentUser);
  const username = document.getElementById("profileUsername").value.trim();
  if (!username) {
    alert("Username is required.");
    return;
  }

  try {
    const result = await apiRequest("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({
        username: username,
        avatarAnimal: document.getElementById("profileAvatarAnimal").value,
        gender: document.getElementById("profileGender").value,
      }),
    });

    currentUser = result.user;
    syncUserContentProfile(previousUsername);
    updateAuthUI();
    if (currentCourseId) loadReviews(currentCourseId);
    closeProfileModal();
  } catch (error) {
    alert(error.message);
  }
}

function syncUserContentProfile(previousUsername) {
  const profile = {
    avatarAnimal: currentUser.avatarAnimal,
    gender: currentUser.gender,
  };

  Object.values(courseReviews).forEach((reviews) => {
    reviews.forEach((review) => {
      if (review.author === previousUsername) {
        review.author = getDisplayName(currentUser);
        review.avatar = profile;
      }
      (review.replies || []).forEach((reply) => {
        if (reply.author === previousUsername) {
          reply.author = getDisplayName(currentUser);
          reply.avatar = profile;
        }
      });
    });
  });
}

// === 新版：安全不當機的收藏頁面渲染邏輯 ===
function renderFavorites() {
  // 1. 抓出所有被使用者按愛心 (followed === true) 的課程
  let favorites = allCourses.filter(course => course.followed === true);
  
  // 2. 抓取目前亮起的純文字排序按鈕（Hottest / Latest / Ratings）
  const activeSortBtn = document.querySelector('.fav-sort-btn.active');
  const sortBy = activeSortBtn ? activeSortBtn.dataset.sort : "popular";

  // 3. 安全的排序邏輯
  if (sortBy === "popular") {
    // Hottest: 依據愛心數量由多到少
    favorites.sort((a, b) => (b.saveCount || 0) - (a.saveCount || 0));
  } else if (sortBy === "latest") {
    // Latest: 依據年份與學期由新到舊
    favorites.sort((a, b) => (b.year - a.year) || (b.semester - a.semester));
  } else if (sortBy === "rating") {
    // Ratings: 依據評分由高到低
    favorites.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  // 
  const container = document.getElementById("favoritesContainer");
  if (container) {
    renderCourseCards(
      container, 
      favorites, 
      "No favorite courses yet"
    );
  }
}

// Login modal
window.openLoginModal = function(showWelcome = true) {
  const modal = document.getElementById("loginModal");
  if (!modal) return;

  modal.style.display = "block";
  modal.classList.add("login-page-overlay");
  // Add active class to trigger background overlay and logo shift
  setTimeout(() => {
    modal.classList.add("active");
  }, 10);

  // Shift logo to the left
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    navbar.classList.add("logo-shifted");
  }

  if (showWelcome) {
    showWelcomeFields();
  } else {
    showAuthFields();
  }

  if (typeof window.switchAuthTab === "function") {
    window.switchAuthTab("login");
  }
};

function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.classList.remove("login-page-overlay", "active");
  
  // Make sure navbar is not shifted
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    navbar.classList.remove("logo-shifted");
  }
}

window.continueAsGuest = function() {
  document.getElementById("navBlock").style.display = "block";
  document.getElementById("mainContentBlock").style.display = "block";
  closeLoginModal();
};

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
  const submitButton = document.getElementById("authSubmitBtn");
  const toggleText = document.querySelector(".toggle-register");
  const registerFields = document.getElementById("registerFields");
  const registerOnlyFields = document.querySelectorAll(".register-only");
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");

  submitButton.dataset.mode = isRegistering ? "register" : "login";
  submitButton.textContent = isRegistering ? "Create Account" : "Login";
  registerFields.style.display = isRegistering ? "grid" : "none";
  tabLogin.classList.toggle("active", !isRegistering);
  tabRegister.classList.toggle("active", isRegistering);
  registerOnlyFields.forEach((field) => {
    field.style.display = isRegistering ? "block" : "none";
    field.required = isRegistering;
  });
  if (isRegistering) updateAvatarPreview();
  if (toggleText) {
    toggleText.innerHTML = isRegistering
      ? 'Already have an account? <a href="#" onclick="toggleRegister(event)">Login here</a>'
      : 'Don\'t have an account? <a href="#" onclick="toggleRegister(event)">Register here</a>';
  }
}

function toggleRegister(event) {
  event.preventDefault();
  const submitButton = document.querySelector("#authForm .btn-submit");
  const isRegistering = submitButton.dataset.mode === "register";
  setRegisterMode(!isRegistering);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function login(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  const submitButton = document.getElementById("authSubmitBtn");
  const isRegistering = submitButton.dataset.mode === "register";

  if (isRegistering && password !== confirmPassword) {
    alert("Confirm password does not match the password.");
    document.getElementById("confirmPassword").focus();
    return;
  }

  if (!username || !password || (isRegistering && !email)) return;

  if (isRegistering && !isValidEmail(email)) {
    alert("Please enter a valid email address.");
    document.getElementById("email").focus();
    return;
  }

  try {
    const endpoint = isRegistering ? "/api/register" : "/api/login";
    const payload = isRegistering
      ? {
          username: username,
          email: email,
          password: password,
          avatarAnimal: document.getElementById("avatarAnimal").value,
          gender: document.getElementById("gender").value,
        }
      : {
          identifier: username,
password,
        };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Authentication failed.");
      return;
    }

    currentUser = data.user;
    // 💡 收下後端寫的本地儲存功能，重整網頁才不會被登出
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    
    await checkUserLogin();
    
    // 💡 結合你的核心功能：登入後用你寫的函式更新第一頁的課程與收藏愛心
    try {
      await fetchCoursesPage(1);
    } catch (e) {
      console.warn('Failed to refresh courses after login', e);
    }

    document.getElementById("authForm").reset();
    switchAuthTab("login");
  } catch (error) {
    alert(error.message || "Unable to complete authentication.");}}

async function logout() {

try {
    // 💡 採用後端的標準安全登出，確保伺服器端的 Session/Cookie 能被正確清除
    await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch (error) {
    // UI should still return to the logged-out state if the session expired.
  }

  currentUser = null;
  localStorage.removeItem("currentUser"); // 💡 補上這行，確保登出時完全清除瀏覽器的記憶！
  updateAuthUI();
document.getElementById("navBlock").style.display = "none";
  document.getElementById("mainContentBlock").style.display = "none";
  
  // 💡 採用後端寫法：確保登出後，新版彈窗會正確切換到「歡迎畫面」，並清空輸入框
  document.getElementById("loginModal").style.display = "block";
  document.getElementById("loginModal").classList.add("login-page-overlay");
  document.getElementById("welcomeStartSection").style.display = "block";
  document.getElementById("authCoreSection").style.display = "none";
  document.getElementById("authForm").reset();

  // 💡 完美保留你的功能：登出後立刻重刷課程列表，把卡片上的愛心全部拔掉
  fetchCoursesPage(1).catch((e) => console.warn('Failed to refresh courses after logout', e));}

async function checkUserLogin() {
  try {

  // 1. 採用後端寫法：帶上憑證去跟伺服器檢查 Session
    const response = await fetch("/api/session", {
      credentials: "same-origin",
    });
    const data = await response.json();

    if (response.ok && data.authenticated && data.user) {
      currentUser = data.user;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      // 💡 保留你原本的彈性：如果 API 沒查到，先看看有沒有 window 的全域變數，都沒有才正式登出
      currentUser = window.__CURRENT_USER__ || null;
      if (!currentUser) localStorage.removeItem("currentUser");
    }
  } catch (error) {
    currentUser = window.__CURRENT_USER__ || null;
    if (!currentUser) localStorage.removeItem("currentUser");
  }

  // 2. 💡 介面連動：如果確認有登入，就把主畫面打開，並完美關閉新版彈窗與遮罩
  if (currentUser) {
    document.getElementById("navBlock").style.display = "block";
    document.getElementById("mainContentBlock").style.display = "block";
    
    if (typeof closeLoginModal === "function") {
      closeLoginModal();
    } else {
      document.getElementById("loginModal").style.display = "none";
    }
    document.getElementById("loginModal").classList.remove("login-page-overlay");
  } else {
    document.getElementById("navBlock").style.display = "none";
    document.getElementById("mainContentBlock").style.display = "none";
    openLoginModal(true);
  }

  updateAuthUI();
}

function updateAuthUI() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userMenu = document.getElementById("userMenu");
  const userAvatar = document.getElementById("userAvatar");

  renderAdminControls();

  userAvatar.className = `user-avatar ${getGenderClass(currentUser?.gender)}`;
  userAvatar.innerHTML = avatarIcon(currentUser);

  if (currentUser) {
    loginBtn.style.display = "none";
    userMenu.style.display = "inline-flex";
    logoutBtn.style.display = "none";
    logoutBtn.textContent = "Logout";
    userAvatar.setAttribute(
      "aria-label",
      `${getDisplayName(currentUser)} account menu`,
    );
  } else {
    loginBtn.style.display = "inline-flex";
    loginBtn.textContent = "Login / Sign in";
    userMenu.style.display = "none";
    logoutBtn.style.display = "none";
    closeUserMenu();
    userAvatar.setAttribute("aria-label", "Account menu");
  }
}

// Course detail page
function openCourseDetail(courseId) {
  const course = allCourses.find((c) => c.id === courseId);
  if (!course) return;

  currentCourseId = courseId;
  const reviews = getReviewsForCourse(courseId);
  const averageRating = getAverageRating(reviews, course.rating);

  const detailCourseCode = document.getElementById("detailCourseCode");
  const detailCourseTerm = document.getElementById("detailCourseTerm");
  const detailTermText = `${course.year} S${course.semester}`;
  detailCourseCode.textContent = course.code;
  detailCourseCode.onclick = (event) => {
    event.stopPropagation();
    searchByTag(course.code);
  };
  detailCourseTerm.textContent = detailTermText;
  detailCourseTerm.onclick = (event) => {
    event.stopPropagation();
    searchByTag(detailTermText);
  };
  document.getElementById("detailCourseTitle").textContent = course.title;
  syncDetailFollowButton(courseId);
  document.getElementById("detailCourseTitleZh").textContent = course.titleZh;
  document.getElementById("detailCourseProfessor").textContent = course.professor || "-";
  document.getElementById("detailCourseDepartment").textContent = course.department;
  document.getElementById("detailCourseCredits").textContent = course.credits;
  document.getElementById("detailCourseDescription").textContent = course.description;
  renderDetailTags(course);
  updateDetailSocialStats(courseId);
  document.getElementById("detailRatingValue").textContent = averageRating.toFixed(1);
  document.getElementById("detailStars").innerHTML = generateStars(averageRating);
  document.getElementById("detailReviewCount").textContent = `Based on ${reviews.length} review${reviews.length !== 1 ? "s" : ""}`;

  renderRatingBreakdown(reviews);
  loadReviews(courseId);

  document.body.classList.add("detail-open");
  const navLogoBtn = document.getElementById("navLogoBtn");
  if (navLogoBtn) navLogoBtn.setAttribute("aria-label", "Back to courses");
  document.getElementById("pageHeading").style.display = "none";
  
  // 🔴 修正：隱藏全新的排序與標籤面板
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "none";
  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";
  
  // Hide admin panels when viewing course detail
  if (document.getElementById("adminAddCoursePanel")) document.getElementById("adminAddCoursePanel").style.display = "none";
  if (document.getElementById("adminEditCoursePanel")) document.getElementById("adminEditCoursePanel").style.display = "none";
  
  document.getElementById("coursesContainer").style.display = "none";
const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "none";
  document.getElementById("courseDetailPage").style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCourseReviewForm(courseId) {
  openCourseDetail(courseId);
  openReviewForm();
}

function handleNavLogoClick() {
  if (document.body.classList.contains("detail-open")) {
    closeCourseDetail();
  }
}

function closeCourseDetail() {
  document.getElementById("courseDetailPage").style.display = "none";
  document.body.classList.remove("detail-open");
  const navLogoBtn = document.getElementById("navLogoBtn");
  if (navLogoBtn) navLogoBtn.setAttribute("aria-label", "Course Review Platform");
  document.getElementById("pageHeading").style.display = "";
  
  // 🟢 修正：回到主頁時，把排序面板顯示回來，過濾面板維持收合
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "";
  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";

  // Restore admin panels when returning to main page
  if (document.getElementById("adminAddCoursePanel")) {
    document.getElementById("adminAddCoursePanel").style.display = isCurrentUserAdmin() ? "block" : "none";
  }
  if (document.getElementById("adminEditCoursePanel")) {
    document.getElementById("adminEditCoursePanel").style.display = "none";
  }

  document.getElementById("coursesContainer").style.display = "";
// 1. 💡 關鍵：把你在前面關卡隱藏的分頁列重新還原顯示！
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "";

  // 2. 💡 呼叫你寫的渲染機制（傳入 allCourses），確保卡片和分頁大腦同步刷新
  displayCourses(allCourses);
  currentCourseId = null;
  renderAdminCoursePanel(null);
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

function renderReactionButtons(review) {
  const counts = review.reactionCounts || {};
  const selectedReaction = review.reaction || "";

  return `
    <div class="review-reaction-bar" aria-label="Review reactions">
      ${REVIEW_REACTIONS.map((emoji) => {
        const count = Number(counts[emoji] || 0);
        const selected = selectedReaction === emoji;
        return `
          <button
            type="button"
            class="review-reaction-btn ${selected ? "selected" : ""}"
            onclick="reactToReview('${review.id}', '${emoji}')"
            aria-pressed="${selected ? "true" : "false"}"
            title="React ${emoji}"
          >
            <span class="review-reaction-emoji">${emoji}</span>
            <span class="review-reaction-count">${count}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

async function reactToReview(reviewId, reaction) {
  if (!currentUser) {
    alert("Please login to react.");
    openLoginModal();
    return;
  }
  if (!currentCourseId) return;

  try {
    const response = await fetch(
      `/api/courses/${currentCourseId}/reviews/${reviewId}/reactions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ reaction }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Unable to update reaction.");
      return;
    }

    applyReviewReactionUpdate(reviewId, data.review);
    await loadReviews(currentCourseId);
  } catch (error) {
    alert("Unable to update reaction.");
  }
}

function applyReviewReactionUpdate(reviewId, updatedReview) {
  if (!updatedReview || !currentCourseId) return;
  const reviews = getReviewsForCourse(currentCourseId);
  const reviewIdNumber = Number(reviewId);

  for (const review of reviews) {
    if (Number(review.id) === reviewIdNumber) {
      Object.assign(review, updatedReview);
      return;
    }
    const reply = (review.replies || []).find((item) => Number(item.id) === reviewIdNumber);
    if (reply) {
      Object.assign(reply, updatedReview);
      return;
    }
  }
}

// Load reviews
async function loadReviews(courseId) {
  const reviewsList = document.getElementById("reviewsList");
  if (!reviewsList) return;

  try {
    const response = await fetch(`/api/courses/${courseId}/reviews`, {
      credentials: "same-origin",
    });
    if (!response.ok) {
      throw new Error(`Review API returned ${response.status}`);
    }

    const data = await response.json();
    const reviews = data.reviews || [];
    courseReviews[courseId] = reviews;

    const course = allCourses.find((entry) => entry.id === courseId);
    if (course) {
      course.rating = data.averageRating ?? course.rating;
      course.reviewCount = data.reviewCount ?? course.reviewCount;
    }

    reviewsList.innerHTML = "";
    updateStudentReviewStats(reviews);
    updateDetailSocialStats(courseId);

    if (data.averageRating !== undefined) {
      document.getElementById("detailRatingValue").textContent = Number(data.averageRating).toFixed(1);
      document.getElementById("detailStars").innerHTML = generateStars(data.averageRating);
      document.getElementById("detailReviewCount").textContent = `Based on ${data.reviewCount} review${data.reviewCount !== 1 ? "s" : ""}`;
    }

    renderRatingBreakdown(reviews);

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
      const totalReplies = replies.length;
      const replyCountText =
        totalReplies > 0
          ? `${totalReplies} ${totalReplies === 1 ? "reply" : "replies"}`
          : "Reply";
      const showReplies = expandedReplyGroups.has(`${review.id}:root`);

      const isMyReview = currentUser && review.author === getDisplayName(currentUser);
      const myActionsHtml = isMyReview ? `
        <div class="my-review-actions">
          <button type="button" class="icon-btn-small" onclick="editReview('${review.id}')" title="edit"><img src="../static/icons/edit.png" width="20" height="20"></button>
          <button type="button" class="icon-btn-small" onclick="deleteReview('${review.id}')" title="delete"><img src="../static/icons/delete.png" width="20" height="20"></button>
        </div>
      ` : "";

      reviewItem.innerHTML = `
            <div class="review-header">
                <div class="review-meta">
                  <span class="review-avatar ${getGenderClass(review.avatar?.gender)}">${avatarIcon(review.avatar || getDefaultProfile(review.author))}</span>
                  <span class="review-author">${escapeHtml(review.author)}</span>
                  <span class="review-dot"></span>
                  <span class="review-date">${escapeHtml(review.date)}</span>
                  ${review.sectionLabel ? `<span class="review-dot"></span><span class="review-section-label">Section: ${escapeHtml(review.sectionLabel)}</span>` : ""}
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  ${myActionsHtml}
                  <span class="review-language" title="${escapeHtml(review.language)}" aria-label="${escapeHtml(review.language)}">${translateIcon()}</span>
                </div>
            </div>
            
            <div class="review-rating-line">
                <span class="review-rating">${starsHtml}</span>
                <span class="review-score">${review.rating.toFixed(1)}</span>
            </div>
            
            <div id="text-display-${review.id}">
              ${renderExpandableText(review.text, `review-${review.id}`, "review-text")}
            </div>
            
            <div id="edit-form-${review.id}" style="display: none; margin: 10px 0;">
              <textarea id="edit-input-${review.id}" class="edit-textarea">${escapeHtml(review.text)}</textarea>
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button type="button" class="btn-submit" onclick="saveEdit('${review.id}')" style="padding: 4px 12px; font-size: 0.85rem;">Save changes</button>
                <button type="button" class="btn-secondary" onclick="cancelEdit('${review.id}')" style="padding: 4px 12px; font-size: 0.85rem;">Cancel</button>
              </div>
            </div>
            
            <div class="review-actions">
              ${renderReactionButtons(review)}
              <button class="review-action-btn reply-open-btn" onclick="toggleReplyForm('${review.id}')" aria-label="Write a reply" title="Write a reply">
                ${commentIcon()}
              </button>
              ${
                totalReplies > 0
                  ? `
              <button class="review-action-btn replies-toggle-btn" onclick="toggleRepliesGroup('${review.id}', 'root')">
                ${replyIcon()}
                <span>${replyCountText}</span>
              </button>
                  `
                  : ""
              }
            </div>

            <div class="reply-form" id="replyForm-${review.id}" style="display: none">
              <input
                type="text"
                id="replyInput-${review.id}"
                placeholder="Write a reply..."
                onkeydown="handleReplyKeydown(event, '${review.id}')"
              />
              <button type="button" onclick="submitReply('${review.id}')">Post</button>
            </div>
            ${showReplies ? `<div class="review-replies">${renderReplies(replies, review.id)}</div>` : ""}
        `;

      reviewsList.appendChild(reviewItem);
    });
  } catch (error) {
    console.warn("Unable to load reviews.", error);
    reviewsList.innerHTML =
      '<p class="empty-reviews">Unable to load reviews right now.</p>';
  }
}

function updateStudentReviewStats(reviews = []) {
  const statsContainer = document.getElementById("studentReviewStats");
  if (!statsContainer) return;

  const totals = reviews.reduce(
    (stats, review) => {
      const replies = review.replies || [];
      stats.likes += review.likes ?? 0;
      stats.comments += 1 + replies.length;
      replies.forEach((reply) => {
        stats.likes += reply.likes ?? 0;
      });
      return stats;
    },
    { likes: 0, comments: 0 },
  );

  statsContainer.innerHTML = `
    <span class="student-review-stat stat-save-display">
      ${heartIcon()} <span>${totals.likes}</span>
    </span>
    <span class="student-review-stat stat-comment">
      ${commentIcon()} <span>${totals.comments}</span>
    </span>
  `;
}

function renderReplies(replies = [], reviewId) {
  return replies
    .map((reply) => {
      // === 判斷這則「回覆」是不是「我」發的 ===
      const isMyReply = currentUser && reply.author === getDisplayName(currentUser);
      
      // 【關鍵修正】把 onclick 改成 editReply 和 deleteReply，並且傳入正確的 reviewId 和 reply.id！
      const myReplyActionsHtml = isMyReply ? `
        <div class="my-review-actions" style="margin-left: auto;">
          <button type="button" class="icon-btn-small" onclick="editReply('${reviewId}', '${reply.id}')" title="edit"><img src="../static/icons/edit.png" width="20" height="20"></button>
          <button type="button" class="icon-btn-small" onclick="deleteReply('${reviewId}', '${reply.id}')" title="delete"><img src="../static/icons/delete.png" width="20" height="20"></button>
        </div>
      ` : "";

      return `
        <div class="reply-thread">
          <div class="reply-item">
            <div class="reply-content" style="width: 100%;">
              <div class="reply-meta" style="display: flex; align-items: center; width: 100%;">
                <span class="reply-avatar ${getGenderClass(reply.avatar?.gender)}">${avatarIcon(reply.avatar || getDefaultProfile(reply.author))}</span>
                <strong>${escapeHtml(reply.author)}</strong>
                <span style="margin-left: 8px;">${escapeHtml(reply.date)}</span>
                ${myReplyActionsHtml}
              </div>
              
              <div id="text-display-${reply.id}">
                ${renderExpandableText(reply.text, `reply-${reviewId}-${reply.id}`, "reply-text")}
              </div>
              
              <div id="edit-form-${reply.id}" style="display: none; margin: 10px 0;">
                <textarea id="edit-input-${reply.id}" class="edit-textarea">${escapeHtml(reply.text)}</textarea>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                  <button type="button" class="btn-submit" onclick="saveEditReply('${reviewId}', '${reply.id}')" style="padding: 4px 12px; font-size: 0.85rem;">Save Change</button>
                  <button type="button" class="btn-secondary" onclick="cancelEditReply('${reply.id}')" style="padding: 4px 12px; font-size: 0.85rem;">Cancel</button>
                </div>
              </div>

              <div class="reply-actions">
                ${renderReactionButtons(reply)}
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function toggleRepliesGroup(reviewId, parentReplyId) {
  const groupKey = `${reviewId}:${parentReplyId}`;
  if (expandedReplyGroups.has(groupKey)) {
    expandedReplyGroups.delete(groupKey);
  } else {
    expandedReplyGroups.add(groupKey);
  }
  loadReviews(currentCourseId);
}

function findReviewById(reviewId) {
  const reviews = getReviewsForCourse(currentCourseId);
  return reviews.find((review) => review.id === reviewId);
}

function findReplyById(reviewId, replyId) {
  const review = findReviewById(reviewId);
  if (!review || !review.replies) return null;
  return review.replies.find((reply) => reply.id === replyId) || null;
}

function toggleReplyForm(reviewId) {
  if (!currentUser) {
    alert("Please login to reply.");
    openLoginModal();
    return;
  }

  const formId = `replyForm-${reviewId}`;
  const inputId = `replyInput-${reviewId}`;
  const replyForm = document.getElementById(formId);
  if (!replyForm) return;

  const isOpen = replyForm.style.display === "flex";
  replyForm.style.display = isOpen ? "none" : "flex";

  if (!isOpen) {
    document.getElementById(inputId).focus();
  }
}

function handleReplyKeydown(event, reviewId) {
  if (event.key !== "Enter" || event.shiftKey) return;

  event.preventDefault();
  submitReply(reviewId);
}

const DEFAULT_REACTION = "❤️";
const REACTION_OPTIONS = [
  "❤️",
  "🙂",
  "👍",
  "😮",
  "😭",
  "🔥",
];

function getReactionSummary(item) {
  if (Array.isArray(item?.reactionSummary) && item.reactionSummary.length > 0) {
    return item.reactionSummary;
  }

  if ((item?.likes ?? 0) > 0 && item?.reaction) {
    return [{ reaction: item.reaction, count: item.likes }];
  }

  return [];
}

function renderReactionStack(item) {
  const summary = getReactionSummary(item);
  if (summary.length === 0) {
    return reactionIcon(item?.liked ? DEFAULT_REACTION : "");
  }

  return summary
    .slice(0, 3)
    .map(
      (entry) =>
        `<span class="emoji-item reaction-summary-item" title="${entry.count}">${entry.reaction}</span>`,
    )
    .join("");
}

function renderReactionControl(item, reviewId, replyId = null) {
  const targetArgs = replyId ? `'${reviewId}', '${replyId}'` : `'${reviewId}'`;
  const paletteButtons = REACTION_OPTIONS.map(
    (reaction) =>
      `<button type="button" onclick="selectReviewEmoji(event, ${targetArgs}, '${reaction}')">${reaction}</button>`,
  ).join("");

  return `
    <div class="reaction-container" data-review-id="${reviewId}" ${replyId ? `data-reply-id="${replyId}"` : ""}>
      <button
        class="review-action-btn main-reaction-btn ${item.liked ? "liked" : ""}"
        onclick="handleQuickLike(event, ${targetArgs})"
        type="button"
      >
        <span class="emoji-stack">
          ${renderReactionStack(item)}
        </span>
        <span class="like-count-num">${item.likes ?? 0}</span>
      </button>
      <div class="reaction-palette">
        ${paletteButtons}
      </div>
    </div>
  `;
}

function replaceReviewInState(review) {
  if (!review || !currentCourseId) return;
  const reviews = getReviewsForCourse(currentCourseId);
  const index = reviews.findIndex((item) => String(item.id) === String(review.id));
  if (index >= 0) {
    reviews[index] = review;
  } else {
    reviews.unshift(review);
  }
}

function replaceCourseInState(course) {
  if (!course) return;
  const index = allCourses.findIndex((item) => String(item.id) === String(course.id));
  if (index >= 0) {
    allCourses[index] = { ...allCourses[index], ...course };
  }
}

function refreshDetailRatingSummary(courseId) {
  const course = allCourses.find((item) => String(item.id) === String(courseId));
  const reviews = getReviewsForCourse(courseId);
  const averageRating = getAverageRating(reviews, course?.rating || 0);

  const value = document.getElementById("detailRatingValue");
  const stars = document.getElementById("detailStars");
  const count = document.getElementById("detailReviewCount");
  if (value) value.textContent = averageRating.toFixed(1);
  if (stars) stars.innerHTML = generateStars(averageRating);
  if (count) count.textContent = `Based on ${reviews.length} review${reviews.length !== 1 ? "s" : ""}`;
  renderRatingBreakdown(reviews);
  updateDetailSocialStats(courseId);
}

function replaceReplyInState(reviewId, reply) {
  if (!reply) return;
  const review = findReviewById(String(reviewId));
  if (!review) return;
  if (!review.replies) {
    review.replies = [];
  }
  const index = review.replies.findIndex((item) => String(item.id) === String(reply.id));
  if (index >= 0) {
    review.replies[index] = reply;
  } else {
    review.replies.push(reply);
  }
}

async function persistReaction(reviewId, reaction, replyId = null) {
  const targetId = replyId || reviewId;
  const endpoint = `/api/courses/${currentCourseId}/reviews/${targetId}/reactions`;
  const result = await apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify({ reaction, remove: !reaction }),
  });

  if (result.review) {
    if (replyId) {
      replaceReplyInState(reviewId, result.review);
    } else {
      replaceReviewInState(result.review);
    }
  }
}

async function applyReaction(reviewId, reaction = "❤️", replyId = null) {
  if (!currentUser) {
    alert("Please login to react.");
    openLoginModal();
    return;
  }

  const target = findReactionTarget(String(reviewId), replyId ? String(replyId) : null);
  const shouldClear = target?.liked && target.reaction === reaction;

  try {
    await persistReaction(reviewId, shouldClear ? "" : reaction, replyId);
    loadReviews(currentCourseId);
  } catch (error) {
    alert(error.message);
  }
}

async function handleQuickLike(event, reviewId, replyId = null) {
  event.stopPropagation();

  if (!currentUser) {
    alert("Please login to react.");
    openLoginModal();
    return;
  }

  const target = findReactionTarget(String(reviewId), replyId ? String(replyId) : null);
  const shouldClear = target?.liked && (target.reaction || "\u2764\uFE0F") === "\u2764\uFE0F";

  try {
    await persistReaction(reviewId, shouldClear ? "" : "\u2764\uFE0F", replyId);
    loadReviews(currentCourseId);
  } catch (error) {
    alert(error.message);
  }
}

function selectReviewEmoji(
  event,
  reviewId,
  replyIdOrReaction,
  maybeReaction = null,
) {
  event.stopPropagation();

  const hasReplyId = maybeReaction !== null;
  const replyId = hasReplyId ? replyIdOrReaction : null;
  const reaction = hasReplyId ? maybeReaction : replyIdOrReaction;
  applyReaction(reviewId, reaction, replyId);
}

async function submitReply(reviewId) {
  if (!currentUser) {
    alert("Please login to reply.");
    openLoginModal();
    return;
  }

  const inputId = `replyInput-${reviewId}`;
  const input = document.getElementById(inputId);
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  try {
    const response = await fetch(`/api/courses/${currentCourseId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        comment: text,
        parentId: Number(reviewId),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Failed to submit reply.");
      return;
    }

    input.value = "";
    expandedReplyGroups.add(`${reviewId}:root`);
    loadReviews(currentCourseId);
  } catch (error) {
    alert(error.message);
  }
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
async function submitReview(event) {
  event.preventDefault();

  if (!currentUser) {
    alert("Please login to submit a review.");
    openLoginModal();
    return;
  }

  if (selectedRating === 0) {
    alert("Please select a rating.");
    return;
  }

// 1. 💡 採用後端的防呆機制，避免使用者送出空白評論
  const reviewText = document.getElementById("reviewText").value.trim();
  if (!reviewText) {
    alert("Please write a review.");
    return;
  }

  try {
    // 2. 💡 必須配合後端新規格：改成複數 /reviews，且內文欄位名稱改為 comment
    const response = await fetch(`/api/courses/${currentCourseId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        rating: selectedRating,
        comment: reviewText, 
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Failed to submit review.");
      return;
    }

    // 3. 同步更新前端的評論資料與平均分數
    courseReviews[currentCourseId] = data.reviews || [];
    const course = allCourses.find((entry) => entry.id === currentCourseId);
    if (course) {
      course.rating = data.averageRating;
      course.reviewCount = data.reviewCount;
    }

    alert("Review submitted successfully!");
    closeReviewModal();

    // 4. 💡 採用後端的無閃爍局部刷新，若函式不存在則執行你原本的重開視窗防呆
    if (typeof loadReviews === "function") {
      await loadReviews(currentCourseId);
      if (typeof updateDetailSocialStats === "function") updateDetailSocialStats(currentCourseId);
      if (typeof renderRatingBreakdown === "function") renderRatingBreakdown(courseReviews[currentCourseId] || []);
    } else if (typeof openCourseDetail === "function" && currentCourseId) {
      openCourseDetail(currentCourseId);
    }
  } catch (error) {
    alert("Unable to submit review.");
  }
}


// Close modals when clicking outside
window.onclick = function (event) {
  const loginModal = document.getElementById("loginModal");
  const profileModal = document.getElementById("profileModal");

  if (event.target === loginModal && currentUser) {
    closeLoginModal();
  }
  if (event.target === profileModal) {
    profileModal.style.display = "none";
  }
};

window.switchAuthTab = function (mode) {
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const submitButton = document.getElementById("authSubmitBtn");
  const registerFields = document.getElementById("registerFields");
  const registerOnlyFields = document.querySelectorAll(".register-only");

  if (!submitButton) return;

  if (mode === "login") {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    submitButton.dataset.mode = "login";
    submitButton.textContent = "Login"; // 按鈕文字變 Login
    registerFields.style.display = "none";
    registerOnlyFields.forEach((field) => {
      field.style.display = "none";
      field.required = false;
    });
  } else {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    submitButton.dataset.mode = "register";
    submitButton.textContent = "Create Account"; // 按鈕文字變註冊
    registerFields.style.display = "grid";
    registerOnlyFields.forEach((field) => {
      field.style.display = "block";
      field.required = true;
    });
    updateAvatarPreview();
  }
};

window.showWelcomeFields = function() {
  const welcome = document.getElementById("welcomeStartSection");
  const auth = document.getElementById("authCoreSection");
  if (welcome) welcome.style.display = "grid";
  if (auth) auth.style.display = "none";
};

window.showAuthFields = function() {
  const welcome = document.getElementById("welcomeStartSection");
  const auth = document.getElementById("authCoreSection");
  if (welcome) welcome.style.display = "none";
  if (auth) auth.style.display = "block";
};

// === 控制 Filter 面板的開關與一鍵重置 ===
window.toggleFilterPanel = function() {
  const panel = document.getElementById('filterPanel');
  const courseDetailPage = document.getElementById("courseDetailPage");
  const favoritesPage = document.getElementById("favoritesPage");
  
  let wasOnOtherPage = false;

  // 1. 如果在其他頁面，先回到主頁
  if (courseDetailPage && courseDetailPage.style.display === "block") {
    if (typeof closeCourseDetail === "function") closeCourseDetail();
    wasOnOtherPage = true;
  }
  if (favoritesPage && favoritesPage.style.display === "block") {
    if (typeof showBrowseCourses === "function") showBrowseCourses();
    wasOnOtherPage = true;
  }

  if (panel) {
    if (wasOnOtherPage) {
      // 從別頁回來，強制展開面板
      panel.style.display = 'block';
    } else {
      // 在主頁點擊漏斗：判斷現在是開還是關
      const isCurrentlyOpen = panel.style.display !== 'none';
      
      if (isCurrentlyOpen) {
        // 【核心新增】如果面板要「關閉」，就一併把條件重置、讓課程全部跑出來！
        panel.style.display = 'none';
        resetAllFilters();
      } else {
        // 如果面板是關的，就單純打開它
        panel.style.display = 'block';
      }
    }
  }
};

// === 專屬的標籤重置小幫手 ===
window.resetAllFilters = function() {

  renderDepartmentFilter("");
  const filterRows = ['yearFilterRow', 'deptCategoryFilterRow', 'deptFilterRow', 'semesterFilterRow', 'ratingFilterRow'];

  filterRows.forEach(rowId => {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const buttons = row.querySelectorAll('.filter-tag-btn');
    // 把這一行所有按鈕的 active 藍色/橘色底拔掉
    buttons.forEach(b => b.classList.remove('active'));
    
    // 找出代表「全部 (All)」的按鈕（它的 data-value 是空的 ""），幫它點亮
    const allBtn = Array.from(buttons).find(b => b.dataset.value === "");
    if (allBtn) {
      allBtn.classList.add('active');
    }
  });

  // 清空搜尋框（如果有的話）
  const searchBox = document.getElementById("searchBox");
  if (searchBox) searchBox.value = "";

  // 重新跑一次篩選函數，讓所有被隱藏的課程卡片瞬間回來！
  if (typeof filterCourses === "function") filterCourses();
};


async function submitReviewAction(reviewId, method, payload) {
  if (!currentCourseId) return null;

  const response = await fetch(`/api/courses/${currentCourseId}/reviews/${reviewId}`, {
    method,
    headers: method === "DELETE" ? undefined : {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: method === "DELETE" ? undefined : JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    alert(data.error || "Action failed.");
    return null;
  }

  return data;
}

// === 刪除評論邏輯 ===
window.deleteReview = async function(reviewId) {
  if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;

// 1. 💡 採用後端封裝好的核心功能，確保安全帶上憑證發送 DELETE 請求
  const data = await submitReviewAction(reviewId, "DELETE");
  if (!data) return;

  // 2. 💡 重新載入該課程的最新評論列表
  if (typeof loadReviews === "function") {
    await loadReviews(currentCourseId);
  }

  // 3. 💡 保留你的前端資料連動：如果後端有回傳最新的課程評分狀態，就同步更新它
  if (data && data.course && typeof replaceCourseInState === "function") {
    replaceCourseInState(data.course);
  }
  
  // 4. 💡 重新刷新你設計的精美評分摘要面板
  if (typeof refreshDetailRatingSummary === "function") {
    refreshDetailRatingSummary(currentCourseId);
  }
};

// === 開啟編輯模式 ===
window.editReview = function(reviewId) {
  document.getElementById(`text-display-${reviewId}`).style.display = 'none';
  document.getElementById(`edit-form-${reviewId}`).style.display = 'block';
};

// === 取消編輯模式 ===
window.cancelEdit = function(reviewId) {
  document.getElementById(`text-display-${reviewId}`).style.display = 'block';
  document.getElementById(`edit-form-${reviewId}`).style.display = 'none';
};

// === 儲存修改的內容 ===
window.saveEdit = async function(reviewId) {
  const newText = document.getElementById(`edit-input-${reviewId}`).value.trim();

  if (!newText) {
    alert("評論內容不能為空喔！");
    return;
  }

// 1. 💡 採用後端封裝好的核心功能，安全發送 PATCH 請求更新修改文字
  const data = await submitReviewAction(reviewId, "PATCH", { text: newText });
  if (!data) return;

  // 2. 💡 重新載入最新評論列表，確保畫面文字是最新的
  if (typeof loadReviews === "function") {
    await loadReviews(currentCourseId);
  }

  // 3. 💡 保留你的前端狀態連動：如果後端有回傳更新後的評論與課程狀態，同步塞回變數中
  if (data) {
    if (data.review && typeof replaceReviewInState === "function") {
      replaceReviewInState(data.review);
    }
    if (data.course && typeof replaceCourseInState === "function") {
      replaceCourseInState(data.course);
    }
  }

  // 4. 💡 重新刷新你設計的精美評分摘要面板
  if (typeof refreshDetailRatingSummary === "function") {
    refreshDetailRatingSummary(currentCourseId);
  }
};

// === 刪除子回覆邏輯 ===
window.deleteReply = async function(reviewId, replyId) {
  if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;

  const data = await submitReviewAction(replyId, "DELETE");
  if (!data) return;

  await loadReviews(currentCourseId);
};

// === 開啟子回覆編輯模式 ===
window.editReply = function(reviewId, replyId) {
  document.getElementById(`text-display-${replyId}`).style.display = 'none';
  document.getElementById(`edit-form-${replyId}`).style.display = 'block';
};

// === 取消子回覆編輯模式 ===
window.cancelEditReply = function(replyId) {
  document.getElementById(`text-display-${replyId}`).style.display = 'block';
  document.getElementById(`edit-form-${replyId}`).style.display = 'none';
};

// === 儲存子回覆修改的內容 ===
window.saveEditReply = async function(reviewId, replyId) {
  const newText = document.getElementById(`edit-input-${replyId}`).value.trim();
  
  if (!newText) {
    alert("回覆內容不能為空喔！");
    return;
  }

  const data = await submitReviewAction(replyId, "PATCH", { text: newText });
  if (!data) return;

  await loadReviews(currentCourseId);
};

// === 自動生成熱門搜尋標籤 ===
function generateDynamicTrending() {
  const trendingContainer = document.querySelector(".trending-tags");
  if (!trendingContainer) return;

  // 1. 把所有課程拿來排序，依據「收藏數 + 評論數」由高到低排
  const sortedCourses = [...allCourses].sort((a, b) => {
    const aPopularity = (a.saveCount || 0) + getCourseCommentTotal(a.id);
    const bPopularity = (b.saveCount || 0) + getCourseCommentTotal(b.id);
    return bPopularity - aPopularity;
  });

  // 2. 抓出前 5 名最紅的課程，提取它們的「系所」或「課程名稱」或「教授」當關鍵字
  const topKeywords = new Set(); // 用 Set 避免重複的字
  sortedCourses.forEach(course => {
    if (topKeywords.size < 5) {
      // 這裡可以自己決定要放什麼，例如放課程名稱
      topKeywords.add(course.title); 
    }
  });

  // 3. 把算出來的關鍵字畫成按鈕，塞進 HTML 裡
  trendingContainer.innerHTML = Array.from(topKeywords).map(keyword => 
    `<button type="button" class="trending-tag-btn">${escapeHtml(keyword)}</button>`
  ).join("");

  // 4. 重新綁定「點擊自動搜尋」的防失焦事件
  const newBtns = trendingContainer.querySelectorAll(".trending-tag-btn");
  const searchBox = document.getElementById("searchBox");
  const searchDropdown = document.getElementById("searchDropdownCard");
  
  newBtns.forEach(btn => {
    btn.addEventListener("mousedown", function(e) {
      e.preventDefault(); 
      searchBox.value = this.textContent.trim(); 
      searchDropdown.style.display = "none";     
      filterCourses();                           
    });
  });
}

// 確保在網頁載入時執行這支自動生成函數
document.addEventListener("DOMContentLoaded", function() {
  // 等假資料都載入後，呼叫生成函數
  setTimeout(generateDynamicTrending, 100); 
});


function updateBackToTopButton() {
  const button = document.getElementById("backToTopBtn");
  if (!button) return;

  button.classList.add("visible");
}

function scrollToPageTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("backToTopBtn");
  if (!button) return;

  button.addEventListener("click", scrollToPageTop);
  updateBackToTopButton();
  window.addEventListener("scroll", updateBackToTopButton, { passive: true });
});

/* ============================================================
   SCHEDULE SIDEBAR — Weekly timetable (Mon–Sat, periods 1–14)
   Multi-semester: each semester keeps its own independent list.
   ============================================================ */
 
// --- State ---
// scheduleData: { "113-1": { courses: ["1","3"], colors: {"1":1,"3":2} }, ... }
let scheduleData = {};
let activeScheduleSemester = null; // e.g. "113-1"
 
// Helpers to get/set active semester's data
function getActiveSemData() {
  if (!activeScheduleSemester) return { courses: [], colors: {} };
  if (!scheduleData[activeScheduleSemester]) {
    scheduleData[activeScheduleSemester] = { courses: [], colors: {} };
  }
  return scheduleData[activeScheduleSemester];
}
 
// Legacy aliases so existing code still works
Object.defineProperty(window, 'myScheduleCourses', {
  get() { return getActiveSemData().courses; },
  set(v) { getActiveSemData().courses = v; },
  configurable: true,
});
 
function getScheduleColorMap() { return getActiveSemData().colors; }
 
const SCHEDULE_COLORS = [1,2,3,4,5,6,7,8];
 
// Period definitions: label + time range
const SCHEDULE_PERIODS = [
  { p: 1,  label: "1",  time: "08:10–09:00" },
  { p: 2,  label: "2",  time: "09:10–10:00" },
  { p: 3,  label: "3",  time: "10:10–11:00" },
  { p: 4,  label: "4",  time: "11:10–12:00" },
  { p: 5,  label: "Lunch", time: "12:00–13:00" },
  { p: 6,  label: "5",  time: "13:10–14:00" },
  { p: 7,  label: "6",  time: "14:10–15:00" },
  { p: 8,  label: "7",  time: "15:10–16:00" },
  { p: 9,  label: "8",  time: "16:10–17:00" },
  { p: 10, label: "9",  time: "17:10–18:00" },
  { p: 11, label: "A",  time: "18:25–19:15" },
  { p: 12, label: "B",  time: "19:20–20:10" },
  { p: 13, label: "C",  time: "20:15–21:05" },
  { p: 14, label: "D",  time: "21:10–22:00" },
];
const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // day index 1–6
 
// --- Toggle sidebar open/close ---
window.toggleScheduleSidebar = function () {
  const sidebar = document.getElementById("scheduleSidebar");
  const overlay = document.getElementById("scheduleOverlay");
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains("open");
  sidebar.classList.toggle("open", !isOpen);
  document.body.classList.toggle("schedule-open", !isOpen);
  if (overlay) overlay.style.display = !isOpen ? "block" : "none";
};
 
window.closeScheduleSidebar = function () {
  const sidebar = document.getElementById("scheduleSidebar");
  const overlay = document.getElementById("scheduleOverlay");
  if (sidebar) sidebar.classList.remove("open");
  document.body.classList.remove("schedule-open");
  if (overlay) overlay.style.display = "none";
};
 
// --- Collect all available semesters from allCourses ---
function getAvailableSemesters() {
  const seen = new Set();
  allCourses.forEach(c => {
    if (c.year && c.semester) seen.add(`${c.year}-${c.semester}`);
  });
  // Sort descending (newest first)
  return [...seen].sort((a, b) => {
    const [ay, as_] = a.split("-").map(Number);
    const [by, bs] = b.split("-").map(Number);
    return (by - ay) || (bs - as_);
  });
}
 
// --- Switch active semester tab ---
window.switchScheduleSemester = function(semKey) {
  activeScheduleSemester = semKey;
  if (!scheduleData[semKey]) scheduleData[semKey] = { courses: [], colors: {} };
  // Update tab UI
  document.querySelectorAll(".sched-sem-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.sem === semKey);
  });
  renderScheduleSidebar();
  updateAllAddButtons();
  updateScheduleBadge();
};
 
// --- Add a course to the active semester's schedule ---
window.addToSchedule = function (courseId) {
  if (!activeScheduleSemester) {
    // Auto-pick the semester that matches this course, or first available
    const course = allCourses.find(c => String(c.id) === String(courseId));
    const key = course ? `${course.year}-${course.semester}` : getAvailableSemesters()[0];
    if (key) window.switchScheduleSemester(key);
    else { showConflictToast("No semester available."); return; }
  }
 
  const semData = getActiveSemData();
  const course = allCourses.find(c => String(c.id) === String(courseId));
  if (!course) return;
 
  // Toggle off if already in schedule
  if (semData.courses.includes(String(courseId))) {
    removeFromSchedule(courseId);
    return;
  }
 
  // Warn if course belongs to a different semester
  const courseSemKey = `${course.year}-${course.semester}`;
  if (courseSemKey !== activeScheduleSemester) {
    if (!confirm(`This course is from ${courseSemKey}, but your active schedule is ${activeScheduleSemester}.\nSwitch to ${courseSemKey} and add?`)) return;
    window.switchScheduleSemester(courseSemKey);
  }
 
  const freshSemData = getActiveSemData();
 
  // Conflict check
  if (course.schedule && course.schedule.length > 0) {
    const conflictCourses = freshSemData.courses
      .map(id => allCourses.find(c => String(c.id) === String(id)))
      .filter(Boolean)
      .filter(c => c.schedule && c.schedule.some(
        slot => course.schedule.some(s => s.day === slot.day && s.period === slot.period)
      ));
    if (conflictCourses.length > 0) {
      const names = conflictCourses.map(c => c.titleZh || c.title).join(", ");
      showConflictToast(`⚠️ Time conflict with: ${names}`);
      return;
    }
  }
 
  // Assign color
  const usedColors = Object.values(freshSemData.colors);
  const freeColor = SCHEDULE_COLORS.find(c => !usedColors.includes(c)) || 1;
  freshSemData.colors[String(courseId)] = freeColor;
  freshSemData.courses.push(String(courseId));
 
  renderScheduleSidebar();
  updateAllAddButtons();
  updateScheduleBadge();
 
  // Open sidebar
  const sidebar = document.getElementById("scheduleSidebar");
  if (sidebar && !sidebar.classList.contains("open")) toggleScheduleSidebar();
};
 
// --- Remove from active semester ---
window.removeFromSchedule = function (courseId) {
  const semData = getActiveSemData();
  semData.courses = semData.courses.filter(id => String(id) !== String(courseId));
  delete semData.colors[String(courseId)];
  renderScheduleSidebar();
  updateAllAddButtons();
  updateScheduleBadge();
};
 
// --- Clear active semester ---
window.clearSchedule = function () {
  const semData = getActiveSemData();
  if (semData.courses.length === 0) return;
  if (!confirm(`Remove all courses from ${activeScheduleSemester} schedule?`)) return;
  semData.courses = [];
  semData.colors = {};
  renderScheduleSidebar();
  updateAllAddButtons();
  updateScheduleBadge();
};
 
// --- Render the full sidebar content ---
function renderScheduleSidebar() {
  renderScheduleSemesterTabs();
  renderScheduleGrid();
  renderScheduleCourseList();
  renderScheduleCredits();
}
 
// --- Build the timetable grid ---
function renderScheduleGrid() {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;
 
  const semData = getActiveSemData();
 
  // Build a lookup: "day-period" → courseId
  const slotMap = {};
  semData.courses.forEach(courseId => {
    const course = allCourses.find(c => String(c.id) === String(courseId));
    if (!course || !course.schedule) return;
    course.schedule.forEach(({ day, period }) => {
      const key = `${day}-${period}`;
      slotMap[key] = courseId;
    });
  });
 
  let html = "";
 
  // Top-left corner cell
  html += `<div class="sched-header-cell period-col" style="font-size:0.6rem;">P\\D</div>`;
 
  // Day header cells
  SCHEDULE_DAYS.forEach(day => {
    html += `<div class="sched-header-cell">${escapeHtml(day)}</div>`;
  });
 
  // Period rows (1-indexed days: Mon=1, Tue=2, … Sat=6)
  SCHEDULE_PERIODS.forEach(({ p, label, time }) => {
    // Period label cell
    html += `
      <div class="sched-period-cell">
        <span>${escapeHtml(label)}</span>
        <span class="sched-period-time">${escapeHtml(time.split("–")[0])}</span>
      </div>
    `;
 
    // Day cells for this period
    for (let dayIndex = 1; dayIndex <= 6; dayIndex++) {
      const key = `${dayIndex}-${p}`;
      const courseId = slotMap[key];
      if (courseId) {
        const course = allCourses.find(c => String(c.id) === String(courseId));
        const colorClass = `course-color-${semData.colors[String(courseId)] || 1}`;
        const shortName = course
          ? (course.titleZh || course.title || "").slice(0, 10)
          : "?";
        html += `
          <div class="sched-cell has-course ${colorClass}">
            <button class="cell-remove-btn" onclick="removeFromSchedule(${courseId})" title="Remove">✕</button>
            <span class="cell-course-name">${escapeHtml(shortName)}</span>
          </div>
        `;
      } else {
        html += `<div class="sched-cell"></div>`;
      }
    }
  });
 
  grid.innerHTML = html;
}
 
// --- Course list chips below grid ---
function renderScheduleCourseList() {
  const list = document.getElementById("scheduleList");
  if (!list) return;
 
  const semData = getActiveSemData();
 
  if (semData.courses.length === 0) {
    list.innerHTML = `
      <div class="schedule-empty-state">
        <span class="empty-icon">🗓️</span>
        No courses in <strong>${activeScheduleSemester || "this semester"}</strong> yet.<br>
        Click <strong>"+ Schedule"</strong> on any course card.
      </div>
    `;
    return;
  }
 
  let html = `<h4>Added Courses (${semData.courses.length})</h4>`;
  semData.courses.forEach(courseId => {
    const course = allCourses.find(c => String(c.id) === String(courseId));
    if (!course) return;
    const colorIndex = semData.colors[String(courseId)] || 1;
    const bgColors = [
      "#4f67b1","#2a8f6f","#c74d30","#7c3aed",
      "#0891b2","#9d5c0d","#b02473","#374151"
    ];
    const bg = bgColors[(colorIndex - 1) % bgColors.length];
    const credits = course.credits ? `${course.credits} cr.` : "";
    const displayName = course.titleZh || course.title;
    const slots = course.schedule && course.schedule.length > 0
      ? course.schedule.map(s => `${SCHEDULE_DAYS[s.day - 1] || "?"}${s.period}`).join(", ")
      : "No time data";
 
    html += `
      <div class="schedule-course-chip" style="background:${bg};">
        <div class="chip-title">
          <div style="font-weight:800;font-size:0.82rem;">${escapeHtml(displayName)}</div>
          <div style="font-size:0.7rem;opacity:0.85;">${escapeHtml(slots)}</div>
        </div>
        ${credits ? `<span class="chip-credits">${escapeHtml(credits)}</span>` : ""}
        <button class="chip-remove" onclick="removeFromSchedule(${courseId})" title="Remove">✕</button>
      </div>
    `;
  });
  list.innerHTML = html;
}
 
// --- Credits bar ---
function renderScheduleCredits() {
  const bar = document.getElementById("scheduleCreditsBar");
  if (!bar) return;
  const semData = getActiveSemData();
  const total = semData.courses.reduce((sum, id) => {
    const c = allCourses.find(x => String(x.id) === String(id));
    return sum + (c?.credits || 0);
  }, 0);
  bar.textContent = `📚 ${semData.courses.length} course${semData.courses.length !== 1 ? "s" : ""} · ${total} credits`;
}
 
// --- Badge on toggle button (total across ALL semesters) ---
function updateScheduleBadge() {
  const badge = document.querySelector("#scheduleToggleBtn .schedule-badge");
  if (!badge) return;
  const n = Object.values(scheduleData).reduce((sum, d) => sum + (d.courses?.length || 0), 0);
  badge.textContent = n;
  badge.style.display = n > 0 ? "flex" : "none";
}
 
// --- Update all "Add to Schedule" buttons across the page ---
function updateAllAddButtons() {
  const semData = getActiveSemData();
  document.querySelectorAll("[data-schedule-id]").forEach(btn => {
    const id = String(btn.dataset.scheduleId);
    const inSchedule = semData.courses.includes(id);
    btn.classList.toggle("in-schedule", inSchedule);
    btn.textContent = inSchedule ? "✓ In Schedule" : "+ Schedule";
  });
}
 
// --- Conflict toast ---
function showConflictToast(msg) {
  let toast = document.getElementById("scheduleConflictToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "scheduleConflictToast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = "block";
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.style.display = "none"; }, 3500);
}
 
// --- Render semester tabs ---
function renderScheduleSemesterTabs() {
  const tabBar = document.getElementById("scheduleTabBar");
  if (!tabBar) return;
 
  const semesters = getAvailableSemesters();
  if (semesters.length === 0) {
    tabBar.innerHTML = `<span style="font-size:0.75rem;opacity:0.7;padding:4px 8px;">No semesters found</span>`;
    return;
  }
 
  // If no active semester yet, pick first
  if (!activeScheduleSemester || !semesters.includes(activeScheduleSemester)) {
    activeScheduleSemester = semesters[0];
    if (!scheduleData[activeScheduleSemester]) scheduleData[activeScheduleSemester] = { courses: [], colors: {} };
  }
 
  tabBar.innerHTML = semesters.map(sem => {
    const count = scheduleData[sem]?.courses?.length || 0;
    const [year, s] = sem.split("-");
    const label = `${year} S${s}`;
    const isActive = sem === activeScheduleSemester;
    return `
      <button
        class="sched-sem-tab${isActive ? " active" : ""}"
        data-sem="${escapeHtml(sem)}"
        onclick="switchScheduleSemester('${escapeHtml(sem)}')"
      >${escapeHtml(label)}${count > 0 ? `<span class="sched-sem-count">${count}</span>` : ""}</button>
    `;
  }).join("");
}
 
// --- Inject HTML for the sidebar and toggle button into the page ---
function injectScheduleSidebarHTML() {
  // Avoid double injection
  if (document.getElementById("scheduleSidebar")) return;
 
  // Toggle button (fixed to right edge)
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "scheduleToggleBtn";
  toggleBtn.setAttribute("aria-label", "Toggle schedule sidebar");
  toggleBtn.innerHTML = `
    📅
    <span class="schedule-toggle-label">Schedule</span>
    <span class="schedule-badge">0</span>
  `;
  toggleBtn.addEventListener("click", toggleScheduleSidebar);
  document.body.appendChild(toggleBtn);
 
  // Overlay (mobile dim)
  const overlay = document.createElement("div");
  overlay.id = "scheduleOverlay";
  overlay.addEventListener("click", closeScheduleSidebar);
  document.body.appendChild(overlay);
 
  // Sidebar panel
  const sidebar = document.createElement("aside");
  sidebar.id = "scheduleSidebar";
  sidebar.className = "schedule-sidebar";
  sidebar.innerHTML = `
    <div class="schedule-sidebar-header">
      <h3>📅 My Schedule</h3>
      <div class="schedule-header-actions">
        <button class="schedule-clear-btn" onclick="clearSchedule()">Clear</button>
        <button class="schedule-close-btn" onclick="closeScheduleSidebar()" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="sched-tab-bar" id="scheduleTabBar"></div>
    <div class="schedule-credits-bar" id="scheduleCreditsBar">📚 0 courses · 0 credits</div>
    <div class="schedule-grid-wrapper">
      <div class="schedule-grid" id="scheduleGrid"></div>
    </div>
    <div class="schedule-course-list" id="scheduleList"></div>
  `;
  document.body.appendChild(sidebar);
}
 
// "+ Schedule" button is now embedded directly in renderCourseCards HTML template above.
 
// Add sample schedule data to sampleCourses so the grid is populated in demo mode
// (Day: 1=Mon … 6=Sat, Period: 1–14)
sampleCourses.forEach(c => {
  if (c.id === 1 && !c.schedule) c.schedule = [{ day: 1, period: 2 }, { day: 1, period: 3 }, { day: 3, period: 2 }, { day: 3, period: 3 }];
  if (c.id === 2 && !c.schedule) c.schedule = [{ day: 2, period: 1 }, { day: 2, period: 2 }, { day: 5, period: 1 }, { day: 5, period: 2 }];
  if (c.id === 3 && !c.schedule) c.schedule = [{ day: 2, period: 5 }, { day: 4, period: 5 }];
  if (c.id === 4 && !c.schedule) c.schedule = [{ day: 1, period: 6 }, { day: 1, period: 7 }, { day: 4, period: 6 }, { day: 4, period: 7 }];
});
 
// --- Bootstrap on DOM ready ---
document.addEventListener("DOMContentLoaded", function () {
  injectScheduleSidebarHTML();
  renderScheduleSidebar();
  updateScheduleBadge();
});