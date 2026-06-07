// Global variables
let currentUser = null;
let currentCourseId = null;
let allCourses = [];
let currentViewMode = 'browse';
// favoritesCache: 所有已收藏課程（跨頁面分頁，獨立維護）
let favoritesCache = [];
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
  activeTab: "activity",
  items: [],
  unreadCount: 0,
};
let departmentGroups = {};
let sportActivityOptions = [];
const UNDERGRAD_COLLEGE_DEPARTMENTS = {
  "文學院": ["文學院", "中文系", "外文系", "音樂系", "劇藝系"],
  "理學院": ["理學院", "化學系", "物理系", "生科系", "應數系"],
  "工學院": ["資工系", "資工全英班", "電機系", "機電系", "材光系", "光電系"],
  "管理學院": ["管理學院", "企管系", "資管系", "財管系", "國際經營學程", "國際學士學程"],
  "海洋科學院": ["海科院（學）", "海資系", "海工系", "海科系"],
  "社會科學院": ["社科院", "政經系", "社會系"],
  "西灣學院": ["人科學程", "國際學士原民專班"],
  "醫學院": ["醫學院", "後醫學系", "生醫科技系", "護理系"],
};

const UNDERGRAD_COLLEGE_ORDER = [
  "文學院",
  "理學院",
  "工學院",
  "半導體及重點科技研究學院",
  "管理學院",
  "國際金融研究學院",
  "海洋科學院",
  "社會科學院",
  "西灣學院",
  "醫學院",
  "其他",
];

const UNDERGRAD_ASSIGNED_DEPARTMENTS = new Set(
  Object.values(UNDERGRAD_COLLEGE_DEPARTMENTS).flat(),
);

const MASTER_COLLEGE_DEPARTMENTS = {
  "文學院": ["中文碩", "外文碩", "音樂碩", "劇藝碩", "哲學碩", "藝管創業所"],
  "理學院": ["化學碩", "物理碩", "生科碩", "應數碩"],
  "工學院": [
    "電機碩",
    "電機電力碩",
    "通訊碩",
    "電信碩程",
    "機電碩",
    "資工碩",
    "資安碩",
    "材光碩",
    "光電碩",
    "環工碩",
    "前瞻應材",
    "積體電路碩",
    "離岸風電碩",
    "緯創資通產碩",
    "零組件研究所",
  ],
  "半導體學院": ["半導體封測所", "半導體製造碩"],
  "管理學院": [
    "管理學院(碩)",
    "企企管碩",
    "企醫管碩",
    "資管碩",
    "財管碩",
    "行銷傳播碩",
    "金融創新產碩",
    "人管碩",
    "人管英語碩程",
  ],
  "國際金融學院": ["國際資產所", "數位金融所"],
  "海洋科學院": ["海資碩", "海工碩", "海科碩", "海事碩", "海生保育碩", "海下科技碩"],
  "社會科學院": ["政治碩", "經濟碩", "社會碩", "公事碩", "亞太碩", "亞太英語碩程", "教育碩", "教人全英碩"],
  "西灣學院": ["社會創新所"],
  "醫學院": ["生醫碩", "醫科碩", "精準醫學碩", "生技醫藥碩"],
};

const MASTER_COLLEGE_ORDER = [
  "文學院",
  "理學院",
  "工學院",
  "管理學院",
  "海洋科學院",
  "社會科學院",
  "西灣學院",
  "醫學院",
  "半導體學院",
  "國際金融學院",
  "其他",
];

const MASTER_ASSIGNED_DEPARTMENTS = new Set(
  Object.values(MASTER_COLLEGE_DEPARTMENTS).flat(),
);

const PROFESSIONAL_MASTER_COLLEGE_DEPARTMENTS = {
  "文學院": [],
  "理學院": ["生科碩專"],
  "工學院": ["環工碩專", "資電碩專", "科技偵查碩專"],
  "管理學院": ["EMBA碩專", "中山同濟EMBA", "人管碩專", "人亞碩專", "財管碩專", "資管碩專", "行傳碩專"],
  "海洋科學院": [],
  "社會科學院": ["亞太碩專", "公事碩專", "政治碩專", "經濟碩專", "社會原碩專", "EMPP碩專", "教育碩專"],
  "西灣學院": [],
  "醫學院": [],
};

const DOCTORAL_COLLEGE_DEPARTMENTS = {
  "文學院": ["中文博", "外文博", "哲學博"],
  "理學院": ["化學博", "物理博", "生科博", "應數博", "理學博"],
  "工學院": ["電機博", "通訊博", "機電博", "資工博", "資工資安博", "材光博", "光電博", "環工博"],
  "管理學院": ["企管博", "企醫管博", "人管博", "財管博", "資管博"],
  "海洋科學院": ["海資博", "海工博", "海科博", "海科全英博", "海生科技博士學程"],
  "社會科學院": ["亞太博", "政治博", "公事博", "教育博", "教人全英博"],
  "西灣學院": [],
  "醫學院": ["生醫博", "醫科博", "精準醫學博", "生技醫藥博", "臨床醫博學程"],
  "半導體學院": ["半導體製造博"],
  "國際金融學院": [],
};

const PROGRAM_COLLEGE_DEPARTMENTS = {
  "碩士班": MASTER_COLLEGE_DEPARTMENTS,
  "碩專班": PROFESSIONAL_MASTER_COLLEGE_DEPARTMENTS,
  "博士班": DOCTORAL_COLLEGE_DEPARTMENTS,
};

const PROGRAM_COLLEGE_ORDERS = {
  "碩士班": MASTER_COLLEGE_ORDER,
  "碩專班": [
    "文學院",
    "理學院",
    "工學院",
    "管理學院",
    "海洋科學院",
    "社會科學院",
    "西灣學院",
    "醫學院",
    "其他",
  ],
  "博士班": [
    "文學院",
    "理學院",
    "工學院",
    "管理學院",
    "海洋科學院",
    "社會科學院",
    "西灣學院",
    "醫學院",
    "半導體學院",
    "國際金融學院",
    "其他",
  ],
};

const PROGRAM_ASSIGNED_DEPARTMENTS = Object.fromEntries(
  Object.entries(PROGRAM_COLLEGE_DEPARTMENTS).map(([category, collegeDepartments]) => [
    category,
    new Set(Object.values(collegeDepartments).flat()),
  ]),
);


const DEPARTMENT_SUBFILTER_GROUPS = {
  "跨院選修": (department) => department.startsWith("跨院選修"),
  "博雅": (department) => department.startsWith("博雅"),
  "跨院EAP/ESP": (department) => ["跨院EAP", "跨院ESP"].includes(department),
  "運動健康": (department) => department.startsWith("運動健康") || department.startsWith("運動進階"),
  "英文": (department) => department.startsWith("英文"),
  ...Object.fromEntries(
    Object.entries(UNDERGRAD_COLLEGE_DEPARTMENTS).map(([college, departments]) => [
      college,
      (department) => departments.includes(department),
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(PROGRAM_COLLEGE_DEPARTMENTS).flatMap(([category, collegeDepartments]) =>
      Object.entries(collegeDepartments).map(([college, departments]) => [
        `${category}:${college}`,
        (department) => departments.includes(department),
      ])
    ),
  ),
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

// 修改 script_2.js 中的 renderReactionControl 函式
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
        onclick="toggleReactionPalette(event)" 
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

  // 展開 Add Course 時，收起 Edit 面板
  if (!isCollapsed) {
    const editPanel = document.getElementById("adminEditCoursePanel");
    if (editPanel) {
      editPanel.style.display = "none";
      editPanel.innerHTML = "";
    }
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

  // Collapse the Add Course form if it's open
  const addForm = document.getElementById("adminAddCourseForm");
  const addToggle = document.getElementById("adminAddCourseToggle");
  if (addForm && !addForm.classList.contains("admin-course-form-collapsed")) {
    addForm.classList.add("admin-course-form-collapsed");
    if (addToggle) addToggle.textContent = "New Course";
  }

  // Show the admin edit panel
  const panel = document.getElementById("adminEditCoursePanel");
  if (panel) {
    panel.style.display = "block";
    renderAdminCoursePanel(course);
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

// script.js around line 401: Improved buildNotificationItem to a modern card style
// script_3.js
function buildNotificationItem(item) {
    const statusClass = item.isRead ? "" : "unread";
    const icon = item.category === "activity" ? "💬" : "🔔";
    const linkAttr = item.link ? `data-link="${escapeHtml(item.link)}"` : "";
    const unreadDot = !item.isRead ? `<span class="noti-unread-dot"></span>` : "";
    return `
        <div class="noti-item ${statusClass}" data-id="${escapeHtml(item.id)}" ${linkAttr}>
          <div class="noti-icon-wrap">${icon}</div>
          <div class="noti-body">
            <p class="noti-msg">${escapeHtml(item.message)}</p>
            <span class="noti-time">${escapeHtml(item.createdAt)}</span>
          </div>
          ${unreadDot}
        </div>
    `;
}

// renderActivityList — legacy shim; real logic in showActivity / loadActivityData

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

function renderNotificationList() {
    const list = document.getElementById("notificationList");
    const empty = document.getElementById("notificationEmpty");
    if (!list || !empty) return;

    const items = notificationState.items || [];
    
    // 根據目前選中的頁籤（Tab）過濾出對應的通知項目
    const filteredItems = items.filter(item => {
        if (item.isRead) return false;
        if (notificationState.activeTab === "activity") {
            return item.category === "activity";
        }
        return item.category !== "activity";
    });

    // 渲染 HTML 內容：有資料就跑 map，沒資料就清空
    list.innerHTML = filteredItems.length ? filteredItems.map(buildNotificationItem).join("") : "";
    
    // 切換空狀態提示的顯示或隱藏
    empty.style.display = filteredItems.length ? "none" : "block";
}

// 重新獲取並重新整理通知的函式
function refreshNotifications() {
    // 如果全域變數 currentUser 不存在（未登入），則不發送請求
    if (!currentUser) {
        console.warn("refreshNotifications: No current user logged in.");
        return;
    }

    fetch("/api/notifications")
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch notifications");
            }
            return response.json();
        })
        .then(data => {
            // 將後端回傳的資料存入全域的 notificationState 狀態機
            notificationState.items = data.notifications || [];
            notificationState.unreadCount = data.unreadCount || 0;

            // 呼叫渲染函式更新畫面，並更新未讀小紅點
            renderNotificationList();
            updateNotificationBadge();
        })
        .catch(error => {
            console.error("Error fetching notifications:", error);
        });
}




async function markAllAsRead() {
  if (!currentUser) return;
  try {
    await apiRequest("/api/notifications/mark_read", {
      method: "POST",
      body: JSON.stringify({}),
    });
    notificationState.items.forEach(item => { item.isRead = true; });
    renderNotificationList();
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
  const allDepartments = Object.values(departmentGroups)
    .flat()
    .map((item) => item.name || item);

  if (groupName === "其他") {
    return getDepartmentsForCategory("大學部")
      .filter((department) => !UNDERGRAD_ASSIGNED_DEPARTMENTS.has(department))
      .sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }

  const [programCategory, programCollege] = groupName.includes(":")
    ? groupName.split(":")
    : ["", ""];

  if (programCollege === "其他" && PROGRAM_ASSIGNED_DEPARTMENTS[programCategory]) {
    return getDepartmentsForCategory(programCategory)
      .filter((department) => !PROGRAM_ASSIGNED_DEPARTMENTS[programCategory].has(department))
      .sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }

  const availableDepartments = new Set(allDepartments);
  if (UNDERGRAD_COLLEGE_DEPARTMENTS[groupName]) {
    return UNDERGRAD_COLLEGE_DEPARTMENTS[groupName].filter((department) =>
      availableDepartments.has(department)
    );
  }

  const collegeDepartments = PROGRAM_COLLEGE_DEPARTMENTS[programCategory]?.[programCollege];
  if (collegeDepartments) {
    return collegeDepartments.filter((department) =>
      availableDepartments.has(department)
    );
  }

  const matcher = DEPARTMENT_SUBFILTER_GROUPS[groupName];
  if (!matcher) return [];

  const departments = allDepartments.filter((department) => matcher(department));

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

  if (category === "大學部") {
    return UNDERGRAD_COLLEGE_ORDER.map((college) => ({
      label: college,
      group: college,
    })).filter((option) => getDepartmentsForGroup(option.group).length > 0);
  }

  if (PROGRAM_COLLEGE_ORDERS[category]) {
    return PROGRAM_COLLEGE_ORDERS[category].map((college) => ({
      label: college,
      group: `${category}:${college}`,
    })).filter((option) => getDepartmentsForGroup(option.group).length > 0);
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
  const displayLabel = targetButton.dataset.label || groupName;
  select.dataset.group = groupName;
  select.dataset.label = displayLabel;
  select.innerHTML = `<option value="">${escapeHtml(displayLabel)}: All</option>${options}`;
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
    showActivity();
  });
  safeAddListener("signOutMenuBtn", "click", logout);
  
  safeAddListener("loginBtn", "click", openLoginModal);
  safeAddListener("logoutBtn", "click", logout);

  // 表單與搜尋事件 (維持不變)
  safeAddListener("authForm", "submit", login);
  safeAddListener("avatarAnimal", "change", updateAvatarPreview);
  safeAddListener("gender", "change", updateAvatarPreview);
  safeAddListener("profileAvatarAnimal", "change", updateProfileAvatarPreview);
  safeAddListener("profileGender", "change", updateProfileAvatarPreview);

  // 收藏頁面過濾器 (維持不變)
  safeAddListener("favoriteDepartmentFilter", "change", renderFavorites);
  safeAddListener("favoriteRatingFilter", "change", renderFavorites);
  safeAddListener("favoriteSortFilter", "change", renderFavorites);

  // ✅ 全新：補上個人資料 (Profile) 專屬的頭像切換事件
  safeAddListener("profileAvatarAnimal", "change", updateProfileAvatarPreview);
  safeAddListener("profileGender", "change", updateProfileAvatarPreview);
  
  const _searchBoxEl = document.getElementById("searchBox");
  if (_searchBoxEl) {
    let _searchDebounceTimer = null;
    _searchBoxEl.addEventListener("input", function () {
      clearTimeout(_searchDebounceTimer);
      updatePageTitle();
      _searchDebounceTimer = setTimeout(() => filterCourses(), 300);
    });
  }

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
    notiDropdown.addEventListener("click", async function (e) {
      const item = e.target.closest(".noti-item");
      if (!item) return;

      e.preventDefault();
      e.stopPropagation();

      const link = item.dataset.link;
      const notiId = String(item.dataset.id);
      const index = notificationState.items.findIndex((n) => String(n.id) === notiId);

      if (index !== -1) {
        // 檢查是不是原本屬於未讀狀態
        const wasUnread = !notificationState.items[index].isRead;
        
        if (wasUnread) {
          // 標記為已讀
          notificationState.items[index].isRead = true;
          // 未讀數量減 1
          notificationState.unreadCount = Math.max(0, notificationState.unreadCount - 1);
          // 更新鈴鐺上的小紅點
          updateNotificationBadge();
        }

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
          const course = allCourses.find((c) => String(c.id) === String(courseId));
          if (!Number.isNaN(courseId) && course) {
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
  if (isLoadingCourses) {
    pendingCourseFetchPage = page;
  return;
  }
  pendingCourseFetchPage = null;
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
                </div>
                <button
                  class="course-follow-btn ${course.followed ? "followed" : ""}"
                  data-course-id="${course.id}"
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

// 修改後的 filterCourses
function filterCourses() {
  const searchTerm = document.getElementById("searchBox")?.value.trim();
  currentViewMode = searchTerm ? 'search' : 'browse'; // 判斷是搜尋模式還是瀏覽模式
  updatePageTitle(); // 👈 每次篩選時都更新標題
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
 
  const course = allCourses.find((c) => String(c.id) === String(courseId))
                || favoritesCache.find((c) => String(c.id) === String(courseId));

  if (!course) {
    // 如果找不到，先試著去後端查一下這門課是不是被收藏的
    try {
      const data = await apiRequest(`/api/courses/${courseId}/favorite`, { method: "POST" });
      // 處理後端邏輯...
      return;
    } catch(e) { console.error("Course not found for toggle"); return; }
  }


  // 樂觀更新：先翻轉狀態讓 UI 立即反應
  const prevFollowed = course.followed;
  const prevSaveCount = course.saveCount || 0;
  course.followed = !prevFollowed;
  course.saveCount = prevFollowed ? Math.max(0, prevSaveCount - 1) : prevSaveCount + 1;
  updateFollowButtonsForCourse(courseId, course.followed, course.saveCount);

  try {
    const data = await apiRequest(`/api/courses/${courseId}/favorite`, {
      method: "POST",
    });
    // 用後端回傳的正確值覆蓋
    course.followed = Boolean(data.followed);
    course.saveCount = data.saveCount ?? course.saveCount;
    updateFollowButtonsForCourse(courseId, course.followed, course.saveCount);

    // 同步更新 favoritesCache（不依賴 allCourses 分頁）
    if (course.followed) {
      // 加入收藏快取（若不存在）
      if (!favoritesCache.some(c => String(c.id) === String(courseId))) {
        favoritesCache.push({ ...course });
      } else {
        // 更新已存在的快取項目
        const idx = favoritesCache.findIndex(c => String(c.id) === String(courseId));
        if (idx !== -1) favoritesCache[idx] = { ...course };
      }
    } else {
      // 從收藏快取移除
      favoritesCache = favoritesCache.filter(c => String(c.id) !== String(courseId));
    }
  } catch (error) {
    // 失敗時還原
    course.followed = prevFollowed;
    course.saveCount = prevSaveCount;
    updateFollowButtonsForCourse(courseId, course.followed, course.saveCount);
    alert(error.message);
    if (error.message.toLowerCase().includes("authentication")) {
      openLoginModal();
    }
  }

  // 如果在 favorites 頁面，移除或加入該卡片
  if (document.getElementById("favoritesPage")?.style.display === "block") {
    renderFavorites();
  }
}

// 只更新所有跟這門課有關的愛心按鈕，不重繪整個列表
function updateFollowButtonsForCourse(courseId, followed, saveCount) {
  // 課程列表卡片上的愛心
  document.querySelectorAll(`.course-follow-btn[data-course-id="${courseId}"]`).forEach((btn) => {
    btn.classList.toggle("followed", followed);
    btn.setAttribute("aria-label", followed ? "Unsave course" : "Save course");
    btn.title = followed ? "Saved" : "Save course";
  });
  // 數量
  const countSpan = document.getElementById(`save-count-${courseId}`);
  if (countSpan) countSpan.textContent = saveCount;
  // 詳情頁的愛心
  syncDetailFollowButton(courseId);
  updateDetailSocialStats(courseId);
}

function syncDetailFollowButton(courseId) {
  const detailFollowBtn = document.getElementById("detailFollowBtn");
  const course = allCourses.find((c) => String(c.id) === String(courseId));
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

function getCourseLikeTotal(courseId) {
  const course = allCourses.find((c) => String(c.id) === String(courseId));
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
  document.getElementById("activityPage").style.display = "none";
  document.getElementById("favoritesPage").style.display = "block";

  // 從後端取最新收藏清單（支援跨頁收藏）
  const container = document.getElementById("favoritesContainer");
  if (container) container.innerHTML = '<p class="empty-state">Loading...</p>';

  apiRequest("/api/user/favorites")
    .then(data => {
      favoritesCache = data.courses || [];
      // 同步 allCourses 的 followed 狀態
      favoritesCache.forEach(fav => {
        const c = allCourses.find(x => String(x.id) === String(fav.id));
        if (c) { c.followed = true; c.saveCount = fav.saveCount; }
      });
      renderFavorites();
    })
    .catch(() => {
      // fallback: 從 allCourses 過濾（只有當前分頁的課程）
      favoritesCache = allCourses.filter(c => c.followed === true);
      renderFavorites();
    });
}

// ── Activity State ───────────────────────────────────────────────────────────
let activityState = {
  activeTab: "personal",
  personalActions: [],
  interactions: [],
  unreadInteractionCount: 0,
  loaded: false,
};

function showActivity() {
  if (!currentUser) {
    alert("Please login to view activity.");
    openLoginModal();
    return;
  }

  document.getElementById("pageHeading").style.display = "none";
  const quickSort = document.getElementById("quickSortMenu");
  if (quickSort) quickSort.style.display = "none";
  const filterPanel = document.getElementById("filterPanel");
  if (filterPanel) filterPanel.style.display = "none";

  document.getElementById("coursesContainer").style.display = "none";
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "none";
  document.getElementById("courseDetailPage").style.display = "none";
  document.getElementById("favoritesPage").style.display = "none";
  document.getElementById("activityPage").style.display = "block";

  switchActivityTab("personal");
  loadActivityData();
}

function switchActivityTab(tab) {
  activityState.activeTab = tab;
  document.getElementById("activityTabPersonal").classList.toggle("active", tab === "personal");
  document.getElementById("activityTabInteractions").classList.toggle("active", tab === "interactions");
  document.getElementById("activityPanelPersonal").style.display = tab === "personal" ? "block" : "none";
  document.getElementById("activityPanelInteractions").style.display = tab === "interactions" ? "block" : "none";
  if (tab === "interactions" && activityState.unreadInteractionCount > 0) {
    markInteractionsRead();
  }
}

async function loadActivityData() {
  const personalList = document.getElementById("activityListPersonal");
  const interactionsList = document.getElementById("activityListInteractions");
  const loadingHtml = `<div class="activity-loading"><div class="activity-loading-spinner"></div><span>Loading…</span></div>`;
  if (personalList) personalList.innerHTML = loadingHtml;
  if (interactionsList) interactionsList.innerHTML = loadingHtml;

  try {
    const res = await fetch("/api/user/activity");
    if (!res.ok) throw new Error("Failed to load activity.");
    const data = await res.json();
    activityState.personalActions = data.personalActions || [];
    activityState.interactions = data.interactions || [];
    activityState.unreadInteractionCount = data.unreadInteractionCount || 0;
    activityState.loaded = true;
    renderPersonalActions();
    renderInteractions();
    updateActivityInteractionBadge();
  } catch (err) {
    const errHtml = `<div class="empty-state-card"><span class="empty-icon">⚠️</span><h3>Could not load activity</h3><p>${err.message}</p></div>`;
    if (personalList) personalList.innerHTML = errHtml;
    if (interactionsList) interactionsList.innerHTML = errHtml;
  }
}

function renderPersonalActions() {
  const list = document.getElementById("activityListPersonal");
  if (!list) return;
  const items = activityState.personalActions;
  if (!items.length) {
    list.innerHTML = `<div class="empty-state-card"><span class="empty-icon">🍌</span><h3>No activity yet</h3><p>Save a course, write a review, or react to a review to see your actions here.</p></div>`;
    return;
  }
  list.innerHTML = items.map(buildPersonalActionCard).join("");
}

function renderInteractions() {
  const list = document.getElementById("activityListInteractions");
  if (!list) return;
  const items = activityState.interactions;
  if (!items.length) {
    list.innerHTML = `<div class="empty-state-card"><span class="empty-icon">💬</span><h3>No interactions yet</h3><p>When someone replies to your review or reacts to your comment, it'll show up here.</p></div>`;
    return;
  }
  list.innerHTML = items.map(buildInteractionCard).join("");
}

function buildPersonalActionCard(item) {
  const typeLabel = {
    favorite: '<span class="activity-type-badge badge-favorite">Saved</span>',
    review:   '<span class="activity-type-badge badge-review">Review</span>',
    reaction: '<span class="activity-type-badge badge-reaction">Reacted</span>',
  }[item.type] || "";
  const ratingHtml = item.type === "review" && item.rating
    ? `<div class="activity-card-rating">${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}</div>` : "";
  const snippetHtml = item.reviewSnippet
    ? `<p class="activity-card-snippet">"${escapeHtml(item.reviewSnippet)}"</p>` : "";
  const courseLink = item.courseId ? `data-course-id="${item.courseId}"` : "";
  return `
    <div class="activity-card" ${courseLink} onclick="handleActivityCardClick(this)" role="button" tabindex="0">
      <div class="activity-card-icon">${escapeHtml(item.icon)}</div>
      <div class="activity-card-body">
        <div class="activity-card-top">${typeLabel}<span class="activity-card-time">${escapeHtml(item.createdAt)}</span></div>
        <p class="activity-card-message">${item.message}</p>
        ${ratingHtml}${snippetHtml}
        <span class="activity-card-course-code">${escapeHtml(item.courseCode || "")}</span>
      </div>
      <div class="activity-card-arrow">›</div>
    </div>`;
}

function buildInteractionCard(item) {
  const unreadDot = !item.isRead ? `<span class="activity-unread-dot"></span>` : "";
  const cardClass = `activity-card interaction-card${item.isRead ? "" : " unread"}`;
  const linkAttr = item.link ? `data-link="${escapeHtml(item.link)}"` : "";
  return `
    <div class="${cardClass}" data-id="${escapeHtml(item.id)}" ${linkAttr}
         onclick="handleInteractionCardClick(this)" role="button" tabindex="0">
      <div class="activity-card-icon">🔔</div>
      <div class="activity-card-body">
        <p class="activity-card-message">${escapeHtml(item.message)}</p>
        <span class="activity-card-time">${escapeHtml(item.createdAt)}</span>
      </div>
      ${unreadDot}
    </div>`;
}

function handleActivityCardClick(el) {
  const courseId = parseInt(el.dataset.courseId);
  if (!courseId) return;
  navigateToCourseFromActivity(courseId);
}

function handleInteractionCardClick(el) {
  const link = el.dataset.link;
  const id = el.dataset.id;
  if (id) {
    markSingleInteractionRead(id);
    el.classList.remove("unread");
    const dot = el.querySelector(".activity-unread-dot");
    if (dot) dot.remove();
  }
  if (link && link.includes("/courses/")) {
    const match = link.match(/\/courses\/(\d+)/);
    if (match) navigateToCourseFromActivity(parseInt(match[1]));
  }
}

async function navigateToCourseFromActivity(courseId) {
  // 先隱藏 Activity 頁面
  document.getElementById("activityPage").style.display = "none";

  // 如果 allCourses 裡已經有這堂課，直接跳
  const cached = allCourses.find((c) => String(c.id) === String(courseId));
  if (cached) {
    openCourseDetail(courseId);
    return;
  }

  // 否則先去 API 拿課程資料，塞進 allCourses，再跳
  try {
    const res = await fetch(`/api/courses/${courseId}`);
    if (!res.ok) throw new Error("Course not found.");
    const data = await res.json();
    const course = data.course || data;
    if (course && course.id) {
      // 避免重複推入
      if (!allCourses.find((c) => String(c.id) === String(course.id))) {
        allCourses.push(course);
      }
      openCourseDetail(course.id);
    }
  } catch (err) {
    alert("無法載入課程資料：" + err.message);
    // 跳回 Activity
    document.getElementById("activityPage").style.display = "block";
  }
}

function updateActivityInteractionBadge() {
  const badge = document.getElementById("activityInteractionBadge");
  if (!badge) return;
  const count = activityState.unreadInteractionCount;
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-flex" : "none";
}

async function markInteractionsRead() {
  try {
    const unreadIds = activityState.interactions.filter(i => !i.isRead).map(i => i.id);
    if (!unreadIds.length) return;
    await apiRequest("/api/notifications/mark_read", { method: "POST", body: JSON.stringify({ ids: unreadIds }) });
    activityState.unreadInteractionCount = 0;
    activityState.interactions = activityState.interactions.map(i => ({ ...i, isRead: true }));
    updateActivityInteractionBadge();
  } catch (_) { /* silent */ }
}

async function markSingleInteractionRead(id) {
  try {
    await apiRequest("/api/notifications/mark_read", { method: "POST", body: JSON.stringify({ ids: [id] }) });
    activityState.interactions = activityState.interactions.map(i => i.id === id ? { ...i, isRead: true } : i);
    activityState.unreadInteractionCount = activityState.interactions.filter(i => !i.isRead).length;
    updateActivityInteractionBadge();
  } catch (_) { /* silent */ }
}

// Legacy shim so any stale callers don't crash
function renderActivityList() {
  if (activityState.loaded) { renderPersonalActions(); renderInteractions(); }
}

function showBrowseCourses() {
  // 1. 隱藏其他頁面
  document.getElementById("favoritesPage").style.display = "none";
  document.getElementById("activityPage").style.display = "none";
  document.getElementById("courseDetailPage").style.display = "none";
  
  // 2. 恢復頁面主標題與相關選單
  document.getElementById("pageHeading").style.display = "";
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "";
  
  // 3. 關鍵修正：強制清空搜尋框的文字
  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.value = ""; 
  }
  
  // 4. 強制更新標題 (變回 All Courses) 與隱藏「Back to Browse」按鈕
  updatePageTitle(); 

  // 5. 確保隱藏篩選面板 (依據您之前的需求)
  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";

  // 6. 顯示課程列表
  document.getElementById("coursesContainer").style.display = "";
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "";
  
  // 7. 移除 body 的 detail-open class (防止排版卡住)
  document.body.classList.remove("detail-open");
  
  // 8. 重新載入完整的課程列表 (因為 searchBox 已經是空的，所以會撈出所有課程)
  filterCourses();
}

function showHomePage() {
  document.body.classList.remove("detail-open");
  currentCourseId = null;
  showBrowseCourses();
  const dropdown = document.getElementById("notificationDropdown");
  if (dropdown) dropdown.style.display = "none";
  const userDropdown = document.getElementById("userDropdown");
  if (userDropdown) userDropdown.hidden = true;
  const avatarMenu = document.getElementById("avatarMenuCard");
  if (avatarMenu) avatarMenu.style.display = "none";
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

function renderFavorites() {
  let favorites = allCourses.filter(course => course.followed === true);
  
  const activeSortBtn = document.querySelector('.fav-sort-btn.active');
  const sortBy = activeSortBtn ? activeSortBtn.dataset.sort : "popular";

  if (sortBy === "popular") {
    // 👈 修改這裡：計算「愛心數 + 總留言數」來排序
    favorites.sort((a, b) => {
      const aPopularity = (a.saveCount || 0) + getCourseCommentTotal(a.id);
      const bPopularity = (b.saveCount || 0) + getCourseCommentTotal(b.id);
      return bPopularity - aPopularity;
    });
  } else if (sortBy === "latest") {
    // Latest: 依據年份與學期由新到舊
    favorites.sort((a, b) => (b.year - a.year) || (b.semester - a.semester));
  } else if (sortBy === "rating") {
    // Ratings: 依據評分由高到低
    favorites.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

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
  const schedBtn = document.getElementById("scheduleToggleBtn");
  if (schedBtn) schedBtn.style.display = "";
  updateBackToTopButton();
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
    await checkUserLogin();
    // refresh courses so `followed` flags come from backend for this user
    try {
      await fetchCoursesPage(1);
    } catch (e) {
      console.warn('Failed to refresh courses after login', e);
    }
    showHomePage();
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
  document.getElementById("navBlock").style.display = "none";
  document.getElementById("mainContentBlock").style.display = "none";
  const schedBtn = document.getElementById("scheduleToggleBtn");
  if (schedBtn) schedBtn.style.display = "none";
  const topBtn = document.getElementById("backToTopBtn");
  if (topBtn) topBtn.classList.remove("visible");
  openLoginModal(true);
  fetchCoursesPage(1).catch((e) => console.warn('Failed to refresh courses after logout', e));
}

async function checkUserLogin() {
  try {
    const session = await apiRequest("/api/session");
    currentUser = session.authenticated ? session.user : currentUser;
  } catch (error) {
    currentUser = window.__CURRENT_USER__ || currentUser;
  }

  document.getElementById("navBlock").style.display = "block";
  document.getElementById("mainContentBlock").style.display = "block";

  if (currentUser) {
    closeLoginModal();
    const schedBtn = document.getElementById("scheduleToggleBtn");
    if (schedBtn) schedBtn.style.display = "";
    updateBackToTopButton();
    // 💡 在這裡觸發通知載入，確保 currentUser 已經正確設定
    refreshNotifications(); 
  } else {
    document.getElementById("navBlock").style.display = "none";
    document.getElementById("mainContentBlock").style.display = "none";
    const schedBtn = document.getElementById("scheduleToggleBtn");
    if (schedBtn) schedBtn.style.display = "none";
    const topBtn = document.getElementById("backToTopBtn");
    if (topBtn) topBtn.classList.remove("visible");
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
  const course = allCourses.find((c) => String(c.id) === String(courseId));
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

  // 找到按鈕元素 (如果你的 HTML ID 是 back-button 則選用該 class)
  const backBtn = document.querySelector(".back-button"); 
  if (backBtn) {
      // 根據模式顯示文字，並保留你的 SVG 圖示
      const labelText = (currentViewMode === 'search') ? "Back to Search" : "Back to Browse";
      backBtn.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 12H5"></path>
          <path d="m12 19-7-7 7-7"></path>
        </svg>
        ${labelText}
      `;
}}

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
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "";
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
  return reviews.find((review) => String(review.id) === String(reviewId));
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
  return review.replies.find((reply) => String(reply.id) === String(replyId)) || null;
}

function findReactionTarget(reviewId, replyId = null) {
  return replyId ? findReplyById(reviewId, replyId) : findReviewById(reviewId);
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
    }
    if (result.reply) {
      replaceReplyInState(reviewId, result.reply);
    }

    input.value = "";
    expandedReplyGroups.add(`${reviewId}:root`);
    loadReviews(currentCourseId);
  } catch (error) {
    alert(error.message);
  }
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

// script.js 找到這一段並修改
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
        onclick="toggleReactionPalette(event)" 
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
  
  // 檢查目前是否已經有表情了
  if (target && target.liked && target.reaction) {
    // 如果已經有表情，就當作「取消該表情」
    try {
        await persistReaction(reviewId, "", replyId); 
        loadReviews(currentCourseId);
    } catch (error) { alert(error.message); }
  } else {
    // 如果沒有表情，才預設給一個愛心
    try {
        await persistReaction(reviewId, "❤️", replyId);
        loadReviews(currentCourseId);
    } catch (error) { alert(error.message); }
  }
}

function selectReviewEmoji(
  event,
  reviewId,
  replyIdOrReaction,
  maybeReaction = null,
) {
  event.stopPropagation();

  // 關閉 palette
  const container = event.currentTarget.closest(".reaction-container");
  if (container) container.classList.remove("open");

  const hasReplyId = maybeReaction !== null;
  const replyId = hasReplyId ? replyIdOrReaction : null;
  const reaction = hasReplyId ? maybeReaction : replyIdOrReaction;
  applyReaction(reviewId, reaction, replyId);
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
  const course = allCourses.find((c) => String(c.id) === String(currentCourseId));

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
// === 控制 Filter 面板的開關與一鍵重置 ===
window.toggleFilterPanel = function() {
  const panel = document.getElementById('filterPanel');
  const courseDetailPage = document.getElementById("courseDetailPage");
  const favoritesPage = document.getElementById("favoritesPage");
  const activityPage = document.getElementById("activityPage"); // 👈 補上 Activity 頁面的抓取

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
  // 👇 補上如果在 Activity 頁面，也要先回到主頁
  if (activityPage && activityPage.style.display === "block") {
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
        // 如果面板要「關閉」，就一併把條件重置、讓課程全部跑出來！
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
window.deleteReview = async function(reviewId) {
  if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;

  try {
    const result = await apiRequest(`/api/reviews/${reviewId}`, {
      method: "DELETE",
    });

    const reviews = courseReviews[currentCourseId];
    if (reviews) {
      const index = reviews.findIndex((review) => String(review.id) === String(reviewId));
      if (index !== -1) reviews.splice(index, 1);
    }
    if (result.course) replaceCourseInState(result.course);

    loadReviews(currentCourseId);
    refreshDetailRatingSummary(currentCourseId);
  } catch (error) {
    alert(error.message);
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

  try {
    const result = await apiRequest(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify({ text: newText }),
    });

    if (result.review) replaceReviewInState(result.review);
    if (result.course) replaceCourseInState(result.course);

    loadReviews(currentCourseId);
    refreshDetailRatingSummary(currentCourseId);
  } catch (error) {
    alert(error.message);
  }
};

// === 刪除子回覆邏輯 ===
window.deleteReply = async function(reviewId, replyId) {
  if (!confirm("Are you sure you want to delete this reply? This action cannot be undone.")) return;

  try {
    const result = await apiRequest(`/api/replies/${replyId}`, {
      method: "DELETE",
    });

    if (result.review) {
      replaceReviewInState(result.review);
    } else {
      // fallback：直接更新本地狀態
      const review = findReviewById(reviewId);
      if (review && review.replies) {
        const index = review.replies.findIndex(r => String(r.id) === String(replyId));
        if (index !== -1) review.replies.splice(index, 1);
      }
    }
    loadReviews(currentCourseId);
  } catch (error) {
    // 後端失敗時 fallback 到前端移除
    const review = findReviewById(reviewId);
    if (review && review.replies) {
      const index = review.replies.findIndex(r => String(r.id) === String(replyId));
      if (index !== -1) {
        review.replies.splice(index, 1);
        loadReviews(currentCourseId);
      }
    }
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
window.saveEditReply = async function(reviewId, replyId) {
  const newText = document.getElementById(`edit-input-${replyId}`).value.trim();
  
  if (!newText) {
    alert("回覆內容不能為空喔！");
    return;
  }

  try {
    const result = await apiRequest(`/api/replies/${replyId}`, {
      method: "PATCH",
      body: JSON.stringify({ text: newText }),
    });

    if (result.review) {
      replaceReviewInState(result.review);
    }
    if (result.reply) {
      replaceReplyInState(reviewId, result.reply);
    } else {
      const reply = findReplyById(reviewId, replyId);
      if (reply) reply.text = newText;
    }
    loadReviews(currentCourseId);
  } catch (error) {
    // fallback：純前端更新
    const reply = findReplyById(reviewId, replyId);
    if (reply) {
      reply.text = newText;
      loadReviews(currentCourseId);
    } else {
      alert(error.message);
    }
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
      const keyword = course.name || course.title;
      if (keyword) topKeywords.add(keyword);
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
  if (!document.getElementById("navBlock") || document.getElementById("navBlock").style.display === "none") {
    button.classList.remove("visible");
    return;
  }
  button.classList.toggle("visible", window.scrollY > 200);
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
  toggleBtn.style.display = "none";
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
  if (String(c.id) === "1" && !c.schedule) c.schedule = [{ day: 1, period: 2 }, { day: 1, period: 3 }, { day: 3, period: 2 }, { day: 3, period: 3 }];
  if (String(c.id) === "2" && !c.schedule) c.schedule = [{ day: 2, period: 1 }, { day: 2, period: 2 }, { day: 5, period: 1 }, { day: 5, period: 2 }];
  if (String(c.id) === "3" && !c.schedule) c.schedule = [{ day: 2, period: 5 }, { day: 4, period: 5 }];
  if (String(c.id) === "4" && !c.schedule) c.schedule = [{ day: 1, period: 6 }, { day: 1, period: 7 }, { day: 4, period: 6 }, { day: 4, period: 7 }];
});
 
// --- Bootstrap on DOM ready ---
document.addEventListener("DOMContentLoaded", function () {
  injectScheduleSidebarHTML();
  renderScheduleSidebar();
  updateScheduleBadge();
});

// 動態更新頁面標題的函式
// script_2.js
function updatePageTitle() {
    const searchBox = document.getElementById("searchBox");
    const heading = document.querySelector("#pageHeading h2");
    const kicker = document.querySelector("#pageHeading .page-kicker");
    const backBtn = document.getElementById("backToBrowseBtn");

    if (searchBox && searchBox.value.trim() !== "") {
        // 搜尋模式
        heading.textContent = "Search Results";
        kicker.textContent = "Searching for: " + searchBox.value;
        if (backBtn) backBtn.style.display = "block"; // 顯示按鈕
    } else {
        // 瀏覽模式
        heading.textContent = "All Courses";
        kicker.textContent = "Let's explore !";
        if (backBtn) backBtn.style.display = "none";  // 隱藏按鈕
    }
}

// script.js 新增這段程式碼
window.toggleReactionPalette = function(event) {
    event.stopPropagation();
    const container = event.currentTarget.closest(".reaction-container");
    
    // 關閉其他所有已開啟的面板
    document.querySelectorAll(".reaction-container.open").forEach(c => {
        if (c !== container) c.classList.remove("open");
    });

    // 切換當前狀態
    if (container) {
        container.classList.toggle("open");
    }
};

// 點擊網頁任何空白處，自動關閉所有開啟的表情選單
document.addEventListener("click", function() {
    document.querySelectorAll(".reaction-container.open").forEach(c => {
        c.classList.remove("open");
    });
});