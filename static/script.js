// Global variables
let currentUser = null;
let currentCourseId = null;
let allCourses = [];
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
  list.innerHTML = items.length ? items.map(buildNotificationItem).join("") : "";
  empty.style.display = items.length ? "none" : "block";
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
  allCourses =
    window.__INITIAL_COURSES__ && window.__INITIAL_COURSES__.length
      ? JSON.parse(JSON.stringify(window.__INITIAL_COURSES__))
      : JSON.parse(JSON.stringify(sampleCourses));
  coursePagination = {
    ...coursePagination,
    ...(window.__COURSE_PAGINATION__ || {}),
  };
  currentUser = window.__CURRENT_USER__ || null;
  departmentGroups = window.__DEPARTMENT_GROUPS__ || {};
  sportActivityOptions = window.__SPORT_ACTIVITY_OPTIONS__ || [];
  renderDepartmentFilter("");
  displayCourses(allCourses);
  setupEventListeners();
  checkUserLogin();
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

function renderDepartmentFilter(category) {
  const row = document.getElementById("deptFilterRow");
  if (!row) return;

  const departments = getDepartmentFilterOptions(category);
  const options = departments
    .map((option) => (
      `<button type="button" class="filter-tag-btn" data-value="${escapeHtml(option.value || "")}" data-group="${escapeHtml(option.group || "")}" data-label="${escapeHtml(option.label)}">${escapeHtml(option.label)}</button>`
    ))
    .join("");

  row.innerHTML = `
    <span class="filter-label">Department │</span>
    <button type="button" class="filter-tag-btn active" data-value="">All</button>
    ${options}
  `;

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
    restoreDepartmentDropdown();
    row.querySelectorAll(".filter-tag-btn").forEach((item) => item.classList.remove("active"));
    this.classList.add("active");
    if (this.dataset.group) {
      renderDepartmentSubFilter(this.dataset.group, this);
    }
    filterCourses();
  });
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

function renderDepartmentSubFilter(groupName, targetButton) {
  if (!groupName || !targetButton) return;
  const subfilterOptions = groupName === "運動健康"
    ? sportActivityOptions
    : getDepartmentsForGroup(groupName);

  const options = subfilterOptions
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");

  const select = document.createElement("select");
  select.className = "department-subfilter-select";
  select.id = "deptSubFilterSelect";
  select.dataset.group = groupName;
  select.dataset.label = targetButton.dataset.label || groupName;
  select.innerHTML = `<option value="">${escapeHtml(groupName)}: All</option>${options}`;
  select.value = "";
  select.addEventListener("change", filterCourses);
  targetButton.replaceWith(select);
  select.focus();
}

function restoreDepartmentDropdown() {
  const select = document.getElementById("deptSubFilterSelect");
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
    // open notification dropdown and show activity tab
    const notiDropdown = document.getElementById("notificationDropdown");
    if (notiDropdown) {
      notiDropdown.style.display = "block";
    }
    switchNotificationTab("activity");
    refreshNotifications();
  });
  safeAddListener("signOutMenuBtn", "click", logout);
  
  safeAddListener("loginBtn", "click", openLoginModal);
  safeAddListener("logoutBtn", "click", logout);

  // 表單與搜尋事件 (維持不變)
  safeAddListener("authForm", "submit", login);
  safeAddListener("avatarAnimal", "change", updateAvatarPreview);
  safeAddListener("gender", "change", updateAvatarPreview);
  safeAddListener("searchBox", "input", filterCourses);

  // 收藏頁面過濾器 (維持不變)
  safeAddListener("favoriteDepartmentFilter", "change", renderFavorites);
  safeAddListener("favoriteRatingFilter", "change", renderFavorites);
  safeAddListener("favoriteSortFilter", "change", renderFavorites);

  // ✅ 全新：補上個人資料 (Profile) 專屬的頭像切換事件
  safeAddListener("profileAvatarAnimal", "change", updateProfileAvatarPreview);
  safeAddListener("profileGender", "change", updateProfileAvatarPreview);
  
  safeAddListener("searchBox", "input", filterCourses);

  // 3. 橫向篩選按鈕列事件 (維持不變)
  const filterRows = ['yearFilterRow', 'deptCategoryFilterRow', 'ratingFilterRow', 'sortFilterRow', 'semesterFilterRow'];
  filterRows.forEach(rowId => {
    const row = document.getElementById(rowId);
    if (!row) return;
    const buttons = row.querySelectorAll('.filter-tag-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', function () {
        buttons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        if (rowId === "deptCategoryFilterRow") {
          renderDepartmentFilter(this.dataset.value || "");
        }
        filterCourses();
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
    notiDropdown.addEventListener("click", function (e) {
      const item = e.target.closest(".notification-item");
      if (item) {
        const link = item.dataset.link;
        if (link) {
          window.location.href = link;
        }
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
function displayCourses(courses) {
  const container = document.getElementById("coursesContainer");
  renderCourseCards(container, courses, "No courses found.");
  renderCoursePagination();
}

function getActiveCourseFilters() {
  const searchTerm = document.getElementById("searchBox")?.value.trim() || "";
  const yearActiveBtn = document.querySelector("#yearFilterRow .filter-tag-btn.active");
  const deptCategoryActiveBtn = document.querySelector("#deptCategoryFilterRow .filter-tag-btn.active");
  const deptActiveBtn = document.querySelector("#deptFilterRow .filter-tag-btn.active");
  const deptSubFilterSelect = document.getElementById("deptSubFilterSelect");
  const ratingActiveBtn = document.querySelector("#ratingFilterRow .filter-tag-btn.active");
  const semActiveBtn = document.querySelector("#semesterFilterRow .filter-tag-btn.active");
  const sortActiveBtn = document.querySelector("#quickSortMenu .sort-text-btn.active");
  const selectedDepartmentGroup = deptSubFilterSelect?.dataset.group || deptActiveBtn?.dataset.group || "";
  const selectedSubDepartment = deptSubFilterSelect?.value || "";
  const selectedSportActivity = selectedDepartmentGroup === "運動健康" ? selectedSubDepartment : "";
  const selectedDepartment = selectedDepartmentGroup && selectedDepartmentGroup !== "運動健康"
    ? selectedSubDepartment
    : deptActiveBtn?.dataset.value || "";

  return {
    q: searchTerm,
    year: yearActiveBtn?.dataset.value || "",
    department_category: deptCategoryActiveBtn?.dataset.value || "",
    department_group: selectedDepartmentGroup,
    department: selectedDepartment,
    sport_activity: selectedSportActivity,
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
  if (isLoadingCourses) return;
  isLoadingCourses = true;
  const container = document.getElementById("coursesContainer");
  if (container) {
    container.innerHTML = '<p class="empty-state">Loading courses...</p>';
  }

  try {
    const data = await apiRequest(buildCoursePageUrl(page));
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
  } catch (error) {
    if (container) {
      container.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    }
  } finally {
    isLoadingCourses = false;
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
    courseCard.className = "course-card";
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
                    <span class="stat-save-display">
                        ${heartIcon()} <span class="save-count-num" id="save-count-${course.id}">${course.saveCount || 0}</span>
                    </span>
                    <span class="stat-comment">${commentIcon()} ${getCourseCommentTotal(course.id)}</span>
                </div>
                <button class="btn-reviews-card" onclick="openCourseReviewForm(${course.id})">Add Review</button>
            </div>
        `;

    container.appendChild(courseCard);
  });
}

// Filter courses based on search and filters
function filterCourses() {
  fetchCoursesPage(1);
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

// === 新版：主頁面課程排序邏輯 ===
function sortCourses(courses, sortBy) {
  const sorted = [...courses];

  if (sortBy === "popular") {
    // Hottest (人氣最高): 依照「收藏數 + 留言數」的總和由多到少排序
    sorted.sort((a, b) => {
      const aPopularity = (a.saveCount || 0) + getCourseCommentTotal(a.id);
      const bPopularity = (b.saveCount || 0) + getCourseCommentTotal(b.id);
      return bPopularity - aPopularity;
    });
  } else if (sortBy === "latest") {
    // Latest (最新開課): 依照年份與學期由新到舊排序
    sorted.sort((a, b) => (b.year - a.year) || (b.semester - a.semester));
  } else if (sortBy === "rating") {
    // Ratings (評分最高): 依照星星數由高到低排序
    sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  return sorted;
}

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
    .map((tag) => `<span class="detail-tag-chip">${escapeHtml(tag)}</span>`)
    .join("");
}

function getCourseLikeTotal(courseId) {
  const course = allCourses.find((c) => c.id === courseId);
  return course?.saveCount || 0;
}

function getCourseCommentTotal(courseId) {
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
      ${heartIcon()} <span>${getCourseLikeTotal(courseId)}</span>
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
  document.getElementById("favoritesPage").style.display = "block";
  renderFavorites();
}

function showBrowseCourses() {
  document.getElementById("favoritesPage").style.display = "none";
  document.getElementById("pageHeading").style.display = "";
  
  // 🟢 修正：回到主頁時，再次把選單顯示出來
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "";

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
window.openLoginModal = function() {
  const modal = document.getElementById("loginModal");
  if (!modal) return;

  // 1. 顯示滿版粉藍色登入蓋台
  modal.style.display = "block";
  modal.classList.add("login-page-overlay");

  // 2. 重設：確保一進去時，先秀出帶有 "Start" 按鈕的歡迎文字區
  const welcomeSection = document.getElementById("welcomeStartSection");
  const authCoreSection = document.getElementById("authCoreSection");
  
  if (welcomeSection) welcomeSection.style.display = "block";
  if (authCoreSection) authCoreSection.style.display = "none";

  // 3. 預設切換回登入（Login）分頁，避免上次停在註冊畫面
  if (typeof window.switchAuthTab === "function") {
    window.switchAuthTab('login');
  }
};

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
  
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  
  // 抓取目前的模式 (login 還是 register)
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
          password: password,
        };
    const result = await apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    currentUser = result.user;
    checkUserLogin();
    // refresh courses so `followed` flags come from backend for this user
    try {
      await fetchCoursesPage(1);
    } catch (e) {
      console.warn('Failed to refresh courses after login', e);
    }
    document.getElementById("authForm").reset();
    switchAuthTab("login");
  } catch (error) {
    alert(error.message);
  }
}

async function logout() {
  try {
    await apiRequest("/api/logout", { method: "POST" });
  } catch (error) {
    // The UI should still return to the logged-out state if the session expired.
  }
  currentUser = null;
  updateAuthUI();
  // Immediately switch UI to logged-out state to avoid flicker
  document.getElementById("navBlock").style.display = "none";
  document.getElementById("mainContentBlock").style.display = "none";
  document.getElementById("loginModal").style.display = "block";
  document.getElementById("loginModal").classList.add("login-page-overlay");
  document.getElementById("welcomeStartSection").style.display = "block";
  document.getElementById("authCoreSection").style.display = "none";
  // Refresh courses in background (non-blocking)
  fetchCoursesPage(1).catch((e) => console.warn('Failed to refresh courses after logout', e));
}

async function checkUserLogin() {
  try {
    const session = await apiRequest("/api/session");
    currentUser = session.authenticated ? session.user : currentUser;
  } catch (error) {
    currentUser = window.__CURRENT_USER__ || currentUser;
  }

  if (currentUser) {
    document.getElementById("navBlock").style.display = "block";
    document.getElementById("mainContentBlock").style.display = "block";
    document.getElementById("loginModal").style.display = "none";
    document.getElementById("loginModal").classList.remove("login-page-overlay");
  } else {
    document.getElementById("navBlock").style.display = "none";
    document.getElementById("mainContentBlock").style.display = "none";
    document.getElementById("loginModal").style.display = "block";
    document.getElementById("loginModal").classList.add("login-page-overlay");
  }
  updateAuthUI();
}

function updateAuthUI() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userMenu = document.getElementById("userMenu");
  const userAvatar = document.getElementById("userAvatar");

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

  document.getElementById("detailCourseCode").textContent = course.code;
  document.getElementById("detailCourseTerm").textContent = `${course.year} S${course.semester}`;
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
  document.querySelector(".navbar").style.display = "none";
  document.getElementById("pageHeading").style.display = "none";
  
  // 🔴 修正：隱藏全新的排序與標籤面板
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "none";
  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";
  
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

function closeCourseDetail() {
  document.getElementById("courseDetailPage").style.display = "none";
  document.body.classList.remove("detail-open");
  document.querySelector(".navbar").style.display = "";
  document.getElementById("pageHeading").style.display = "";
  
  // 🟢 修正：回到主頁時，把排序面板顯示回來，過濾面板維持收合
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "";
  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";

  document.getElementById("coursesContainer").style.display = "";
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "";
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
  updateStudentReviewStats(reviews);
  updateDetailSocialStats(courseId);

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

    // === 判斷這則評論是不是「我」發的 ===
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
              ${renderReactionControl(review, review.id)}

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
                ${renderReactionControl(reply, reviewId, reply.id)}
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
  return review.replies.find((reply) => reply.id === replyId) || null;
}

function findReactionTarget(reviewId, replyId = null) {
  return replyId ? findReplyById(reviewId, replyId) : findReviewById(reviewId);
}

function applyReaction(reviewId, reaction = "❤️", replyId = null) {
  if (!currentUser) {
    alert("Please login to react.");
    openLoginModal();
    return;
  }

  const target = findReactionTarget(reviewId, replyId);
  if (!target) return;

  if (!target.liked) {
    target.likes = (target.likes ?? 0) + 1;
  }

  target.liked = true;
  target.reaction = reaction;
  loadReviews(currentCourseId);
}

function handleQuickLike(event, reviewId, replyId = null) {
  event.stopPropagation();

  const target = findReactionTarget(reviewId, replyId);
  if (target?.liked && (target.reaction || "❤️") === "❤️") {
    if (!currentUser) {
      alert("Please login to react.");
      openLoginModal();
      return;
    }

    target.liked = false;
    target.reaction = "";
    target.likes = Math.max(0, (target.likes ?? 0) - 1);
    loadReviews(currentCourseId);
    return;
  }

  applyReaction(reviewId, "❤️", replyId);
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

function submitReply(reviewId) {
  if (!currentUser) {
    alert("Please login to reply.");
    openLoginModal();
    return;
  }

  const review = findReviewById(reviewId);
  const inputId = `replyInput-${reviewId}`;
  const input = document.getElementById(inputId);
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
    reaction: "",
    replies: [],
  });

  expandedReplyGroups.add(`${reviewId}:root`);
  loadReviews(currentCourseId);
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
  }
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
  const endpoint = replyId
    ? `/api/replies/${replyId}/reaction`
    : `/api/reviews/${reviewId}/reaction`;
  const result = await apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify({ reaction }),
  });

  if (result.review) {
    replaceReviewInState(result.review);
  }
  if (result.reply) {
    replaceReplyInState(reviewId, result.reply);
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
    const result = await apiRequest(`/api/reviews/${reviewId}/reply`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });

    if (result.review) {
      replaceReviewInState(result.review);
    } else if (result.reply) {
      replaceReplyInState(reviewId, result.reply);
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
    return;
  }

  if (selectedRating === 0) {
    alert("Please select a rating.");
    return;
  }

  const reviewText = document.getElementById("reviewText").value;
  const course = allCourses.find((c) => c.id === currentCourseId);

  try {
    const result = await apiRequest(`/api/courses/${currentCourseId}/review`, {
      method: "POST",
      body: JSON.stringify({
        rating: selectedRating,
        text: reviewText,
        language: "English",
      }),
    });

    if (!courseReviews[currentCourseId]) {
      courseReviews[currentCourseId] = [];
    }
    courseReviews[currentCourseId].unshift(result.review);

    if (course && result.course) {
      Object.assign(course, result.course);
    }

    alert("Review submitted successfully!");
    closeReviewModal();

    if (currentCourseId) {
      openCourseDetail(currentCourseId);
    }
  } catch (error) {
    alert(error.message);
  }
}

// Close modals when clicking outside
window.onclick = function (event) {
  const loginModal = document.getElementById("loginModal");
  const profileModal = document.getElementById("profileModal");

  if (event.target === loginModal) {
    loginModal.style.display = "none";
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

// 按下 Start 按鈕後切換區塊
window.showAuthFields = function() {
  // 1. 把第一階段的純文字與 Start 按鈕徹底隱藏（不佔空間）
  document.getElementById("welcomeStartSection").style.display = "none";
  // 2. 把第二階段的白色登入卡片方塊顯示出來
  document.getElementById("authCoreSection").style.display = "block";
}

// 控制 Filter 面板的開關
window.toggleFilterPanel = function() {
  const panel = document.getElementById('filterPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

// 綁定「標籤」的點擊事件
document.addEventListener("DOMContentLoaded", function() {
  const filterOptions = document.querySelectorAll('.filter-options');
  
  filterOptions.forEach(group => {
    const pills = group.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        // 把同一個 row 裡面的標籤全部取消 active
        pills.forEach(p => p.classList.remove('active'));
        // 幫剛點擊的標籤加上 active
        e.target.classList.add('active');
        // 觸發重新篩選
        filterCourses();
      });
    });
  });
});

// === 強效修正：確保頭像點擊絕對能開關選單 ===
document.addEventListener("DOMContentLoaded", function() {
  const userAvatar = document.getElementById("userAvatar");
  
  if (userAvatar) {
    // 移除舊的監聽，重新綁定一個最直接、不會壞的點擊事件
    userAvatar.onclick = function(e) {
      e.stopPropagation(); // 阻止事件擴散
      
      // 如果還沒登入，就打開歡迎/登入視窗
      if (!currentUser) {
        if (typeof window.openLoginModal === "function") {
          window.openLoginModal();
        }
        return;
      }
      
      // 如果已經登入，就精準開關我們的 Google 風格卡片
      const menuCard = document.getElementById("avatarMenuCard");
      if (menuCard) {
        const isHidden = menuCard.style.display === "none" || menuCard.style.display === "";
        menuCard.style.display = isHidden ? "block" : "none";
      } else {
        console.error("找不到 id='avatarMenuCard' 的 HTML 元件，請檢查 index.html 中是否有寫對！");
      }
    };
  }
});

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
  renderDepartmentSubFilter("");
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


// === 刪除評論邏輯 ===
window.deleteReview = function(reviewId) {
  if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;

  const reviews = courseReviews[currentCourseId];
  if (!reviews) return;

  // 找出該則評論在陣列中的位置並刪除
  const index = reviews.findIndex(r => r.id === reviewId);
  if (index !== -1) {
    reviews.splice(index, 1); // 刪除資料

    // 重新計算這堂課的平均星星數與評論總數
    const course = allCourses.find(c => c.id === currentCourseId);
    if (course) {
      course.reviewCount = reviews.length;
      course.rating = getAverageRating(reviews, course.rating);
    }

    // 重新渲染畫面
    loadReviews(currentCourseId);
    
    // 如果有打開上方課程詳細卡片，也一併更新右上角的星星數字
    if (document.getElementById("courseDetailPage").style.display === "block") {
      document.getElementById("detailRatingValue").textContent = course.rating.toFixed(1);
      document.getElementById("detailStars").innerHTML = generateStars(course.rating);
      document.getElementById("detailReviewCount").textContent = `Based on ${reviews.length} review${reviews.length !== 1 ? "s" : ""}`;
    }
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
window.saveEdit = function(reviewId) {
  const newText = document.getElementById(`edit-input-${reviewId}`).value.trim();
  
  if (!newText) {
    alert("評論內容不能為空喔！");
    return;
  }

  const review = findReviewById(reviewId);
  if (review) {
    review.text = newText;
    // 更新完畢後，重新渲染評論列表
    loadReviews(currentCourseId);
  }
};

// === 刪除子回覆邏輯 ===
window.deleteReply = function(reviewId, replyId) {
  if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;

  const review = findReviewById(reviewId);
  if (!review || !review.replies) return;

  // 找出該則回覆在陣列中的位置並刪除
  const index = review.replies.findIndex(r => r.id === replyId);
  if (index !== -1) {
    review.replies.splice(index, 1);
    
    // 重新渲染畫面
    loadReviews(currentCourseId);
  }
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
window.saveEditReply = function(reviewId, replyId) {
  const newText = document.getElementById(`edit-input-${replyId}`).value.trim();
  
  if (!newText) {
    alert("回覆內容不能為空喔！");
    return;
  }

  const reply = findReplyById(reviewId, replyId);
  if (reply) {
    reply.text = newText;
    // 更新完畢後，重新渲染
    loadReviews(currentCourseId);
  }
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
