// Global variables
let currentUser = null;
let currentCourseId = null;
let courseReturnState = { courseId: null, scrollY: 0 };
let allCourses = [];
let currentViewMode = 'browse';
let courseDetailOrigin = 'browse'; // 'browse' | 'favorites' | 'activity'
let favoritesCache = [];
let selectedRating = 0;
const selectedDimRatings = { Quality: 0, Sweetness: 0, Coolness: 0, Solidity: 0 };
const expandedReplyGroups = new Set();
const expandedTextItems = new Set();
const TEXT_PREVIEW_LIMIT = 200;
const COURSES_PER_PAGE = 60;
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
let latestCourseYear = Number(window.__LATEST_COURSE_YEAR__ || 0);
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
  const isReply = !!replyId;
  const paletteButtons = REACTION_OPTIONS.map(
    (reaction) =>
      `<button type="button" class="${isReply ? 'reply-emoji-btn' : ''}" onclick="selectReviewEmoji(event, ${targetArgs}, '${reaction}')">${reaction}</button>`,
  ).join("");

  const replyAttr = replyId ? `data-reply-id="${replyId}"` : "";
  const innerHtml = isCurrentUserAdmin()
    ? `<span class="like-count-num">${item.likes ?? 0} reactions</span>`
    : `<button
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
      </div>`;

  return `
    <div class="reaction-container" data-review-id="${reviewId}" ${replyAttr}>
      ${innerHtml}
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

// ── Admin Modal ───────────────────────────────────────────────────

function openAdminModal(mode, course = null) {
  // 先關 dropdown
  const dropdown = document.getElementById("userDropdown");
  if (dropdown) dropdown.hidden = true;

  const modal   = document.getElementById("adminCourseModal");
  const form    = document.getElementById("adminModalForm");
  const kicker  = document.getElementById("adminModalKicker");
  const title   = document.getElementById("adminModalTitle");
  const submitBtn  = document.getElementById("adminModalSubmitBtn");
  const deleteBtn  = document.getElementById("adminModalDeleteBtn");
  const courseIdEl = document.getElementById("adminModalCourseId");

  form.reset();
  courseIdEl.value = "";

  if (mode === "add") {
    kicker.textContent   = "New Course";
    title.textContent    = "Add a Course";
    submitBtn.textContent = "Add Course";
    deleteBtn.style.display = "none";
  } else {
    kicker.textContent   = "Edit Course";
    title.textContent    = "Edit Course";
    submitBtn.textContent = "Save Changes";
    deleteBtn.style.display = "inline-flex";
    courseIdEl.value = course.id;

    // Populate fields — 用 if 保護，避免 HTML 沒有某欄位時噴 TypeError
    if (form.elements["code"])           form.elements["code"].value           = course.code        || "";
    if (form.elements["title"])          form.elements["title"].value          = course.title       || course.name || "";
    if (form.elements["title_zh"])       form.elements["title_zh"].value       = course.titleZh     || "";
    if (form.elements["department"])     form.elements["department"].value     = course.department  || "";
    if (form.elements["year"])           form.elements["year"].value           = course.year        || "";
    if (form.elements["semester"])       form.elements["semester"].value       = course.semester    || "";
    if (form.elements["credits"])        form.elements["credits"].value        = course.credits     || "";
    if (form.elements["grade"])          form.elements["grade"].value          = course.grade       || "";
    if (form.elements["professor"])      form.elements["professor"].value      = course.professor   || "";
    if (form.elements["requirement"])    form.elements["requirement"].value    = course.requirement || "";
    if (form.elements["description"])    form.elements["description"].value    = course.description || "";
    if (form.elements["english_taught"]) form.elements["english_taught"].checked = !!course.englishTaught;
  }

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  setTimeout(() => form.elements["code"].focus(), 80);
}

function closeAdminModal() {
  const modal = document.getElementById("adminCourseModal");
  modal.style.display = "none";
  document.body.style.overflow = "";
}

function adminModalOverlayClick(e) {
  if (e.target === document.getElementById("adminCourseModal")) closeAdminModal();
}

async function submitAdminModal(event) {
  event.preventDefault();
  const form      = event.currentTarget;
  const courseId  = form.elements["courseId"].value;
  const isEdit    = !!courseId;
  const submitBtn = document.getElementById("adminModalSubmitBtn");

  submitBtn.disabled = true;
  submitBtn.textContent = isEdit ? "Saving…" : "Adding…";

  const payload = {
    code:         form.elements["code"]        ? form.elements["code"].value.trim()        : "",
    title:        form.elements["title"]       ? form.elements["title"].value.trim()       : "",
    title_zh:     form.elements["title_zh"]    ? form.elements["title_zh"].value.trim()    : "",
    department:   form.elements["department"]  ? form.elements["department"].value.trim()  : "",
    year:         form.elements["year"]        ? form.elements["year"].value.trim()        : "",
    semester:     form.elements["semester"]    ? form.elements["semester"].value.trim()    : "",
    credits:      form.elements["credits"]     ? form.elements["credits"].value.trim()     : "",
    grade:        form.elements["grade"]       ? form.elements["grade"].value.trim()       : "",
    professor:    form.elements["professor"]   ? form.elements["professor"].value.trim()   : "",
    requirement:  form.elements["requirement"] ? form.elements["requirement"].value.trim() : "",
    description:  form.elements["description"] ? form.elements["description"].value.trim() : "",
    englishTaught: form.elements["english_taught"] ? form.elements["english_taught"].checked : false,
  };

  try {
    if (isEdit) {
      const result = await apiRequest(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (result.course) {
        replaceCourseInState(result.course);
        displayCourses(allCourses);
        closeAdminModal();
        openCourseDetail(result.course.id);
      }
    } else {
      const result = await apiRequest("/api/admin/courses", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (result.course) {
        allCourses.unshift(result.course);
        displayCourses(allCourses);
        closeAdminModal();
      }
    }
  } catch (err) {
    alert(err.message || "操作失敗，請再試一次。");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? "Save Changes" : "Add Course";
  }
}

async function deleteAdminCourseFromModal() {
  const courseId = document.getElementById("adminModalCourseId").value;
  if (!courseId || !confirm("確定要刪除這門課程嗎？此操作無法還原。")) return;
  try {
    await apiRequest(`/api/admin/courses/${courseId}`, { method: "DELETE" });
    allCourses = allCourses.filter(c => String(c.id) !== String(courseId));
    delete courseReviews[courseId];
    closeAdminModal();
    closeCourseDetail();
    displayCourses(allCourses);
  } catch (err) {
    alert(err.message);
  }
}

// Keyboard close
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && document.getElementById("adminCourseModal")?.style.display === "flex") {
    closeAdminModal();
  }
});

function renderAdminControls() {
  // Add Course 按鈕在 pageHeading 右側
  const addBtn = document.getElementById("adminAddCourseBtn");
  if (addBtn) addBtn.style.display = isCurrentUserAdmin() ? "inline-flex" : "none";

  // Admin badge 在頭像旁邊
  const badge = document.getElementById("adminBadgeNav");
  if (badge) badge.style.display = isCurrentUserAdmin() ? "inline-flex" : "none";

  // dropdown 裡不再放 admin badge
}

// Edit trigger from course card (called by admin-course-card click path)
window.openAdminEditCourse = function(course) {
  if (!course || !isCurrentUserAdmin()) return;
  openAdminModal("edit", course);
};

// Keep legacy name working
function renderAdminCoursePanel(course) {
  // no-op – replaced by modal
}

function setupAdminForms() {
  // no-op – modal uses inline onsubmit
}

// 從課程卡片 Edit 按鈕呼叫
window.openAdminEditById = function(courseId) {
  const course = allCourses.find(c => String(c.id) === String(courseId));
  if (!course) { alert("找不到課程資料，請重新整理頁面。"); return; }
  openAdminModal("edit", course);
};

// 從課程卡片 Delete 按鈕呼叫
window.deleteAdminCourse = async function(courseId) {
  if (!courseId || !confirm("確定要刪除這門課程嗎？此操作無法還原。")) return;
  try {
    await apiRequest(`/api/admin/courses/${courseId}`, { method: "DELETE" });
    allCourses = allCourses.filter(c => String(c.id) !== String(courseId));
    delete courseReviews[courseId];
    if (String(currentCourseId) === String(courseId)) closeCourseDetail();
    displayCourses(allCourses);
  } catch (err) {
    alert(err.message || "刪除失敗，請再試一次。");
  }
};
function buildNotificationItem(item) {
    const statusClass = item.isRead ? "" : "unread";
    const icon = item.category === "activity" ? "💬" : "🔔";
    const linkAttr = item.link ? `data-link="${escapeHtml(item.link)}"` : "";
    const unreadDot = !item.isRead ? `<span class="noti-unread-dot"></span>` : "";

    // Parse course id and scroll target from link (e.g. /courses/42#review-7 or /courses/42#reply-7-99)
    let courseIdAttr = "";
    let targetAttr = "";
    if (item.link) {
      const courseMatch = String(item.link).match(/\/courses\/(\d+)/);
      if (courseMatch) courseIdAttr = `data-course-id="${courseMatch[1]}"`;
      const hashMatch = String(item.link).match(/#(review-\d+|reply-\d+-\d+)$/);
      if (hashMatch) targetAttr = `data-target="${escapeHtml(hashMatch[1])}"`;
    }

    return `
        <div class="noti-item ${statusClass}" data-id="${escapeHtml(item.id)}" ${linkAttr} ${courseIdAttr} ${targetAttr}>
          <div class="noti-icon-wrap">${icon}</div>
          <div class="noti-body">
            <p class="noti-msg">${escapeHtml(item.message)}</p>
            <span class="noti-time">${escapeHtml(item.createdAt)}</span>
          </div>
          ${unreadDot}
        </div>
    `;
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

function renderNotificationList() {
    const list = document.getElementById("notificationList");
    const empty = document.getElementById("notificationEmpty");
    if (!list || !empty) return;

    const items = notificationState.items || [];

    const filteredItems = items.filter(item => {
        if (item.isRead) return false;
        if (notificationState.activeTab === "activity") {
            return item.category === "activity";
        }
        return item.category !== "activity";
    });

    list.innerHTML = filteredItems.length ? filteredItems.map(buildNotificationItem).join("") : "";

    empty.style.display = filteredItems.length ? "none" : "block";
}

function refreshNotifications() {
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
            notificationState.items = data.notifications || [];
            notificationState.unreadCount = data.unreadCount || 0;

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
  // 不在頁面載入時塞入大量資料，改以後端分頁 API 取得
  allCourses = [];
  coursePagination = {
    ...coursePagination,
    ...(window.__COURSE_PAGINATION__ || {}),
  };
  currentUser = window.__CURRENT_USER__ || null;
  departmentGroups = window.__DEPARTMENT_GROUPS__ || {};
  sportActivityOptions = window.__SPORT_ACTIVITY_OPTIONS__ || [];
  latestCourseYear = Number(window.__LATEST_COURSE_YEAR__ || latestCourseYear || 0);
  updateLatestYearToggleLabel();
  renderDepartmentFilter("");
  setupEventListeners();
  setupAdminForms();
  checkUserLogin();
  renderAdminControls();
  refreshNotifications();
  startNotificationPolling();

  // 以 server-side 頁面為主，載入第 1 頁
  fetchCoursesPage(1).catch((e) => console.warn('Initial fetchCoursesPage failed', e));
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



function setupEventListeners() {
  const safeAddListener = (id, eventType, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(eventType, handler);
  };

  const userAvatar = document.getElementById("userAvatar");
  if (userAvatar) {
    // 只用 onclick，避免與下方 DOMContentLoaded 的 onclick 重複觸發
    userAvatar.onclick = function (e) {
      e.stopPropagation();

      // 輕彈跳特效
      userAvatar.classList.remove("avatar-click-pop", "avatar-ripple");
      void userAvatar.offsetWidth;
      userAvatar.classList.add("avatar-click-pop", "avatar-ripple");
      userAvatar.addEventListener("animationend", () => {
        userAvatar.classList.remove("avatar-click-pop", "avatar-ripple");
      }, { once: true });

      if (currentUser) {
        const menu = document.getElementById("userDropdown");
        if (menu) menu.hidden = !menu.hidden;
      } else {
        openLoginModal();
      }
    };
  }

  document.addEventListener("click", function () {
    const menu = document.getElementById("userDropdown");
    if (menu) menu.hidden = true;
  });

  safeAddListener("profileMenuBtn", "click", openProfileModal);
  safeAddListener("favoritesMenuBtn", "click", showFavorites);
  safeAddListener("activityMenuBtn", "click", function () {
    showActivity();
  });
  safeAddListener("signOutMenuBtn", "click", logout);

  safeAddListener("loginBtn", "click", openLoginModal);
  safeAddListener("logoutBtn", "click", logout);

  safeAddListener("authForm", "submit", login);
  safeAddListener("avatarAnimal", "change", updateAvatarPreview);
  safeAddListener("gender", "change", updateAvatarPreview);
  safeAddListener("profileAvatarAnimal", "change", updateProfileAvatarPreview);
  safeAddListener("profileGender", "change", updateProfileAvatarPreview);

  safeAddListener("favoriteDepartmentFilter", "change", renderFavorites);
  safeAddListener("favoriteRatingFilter", "change", renderFavorites);
  safeAddListener("favoriteSortFilter", "change", renderFavorites);

  safeAddListener("profileAvatarAnimal", "change", updateProfileAvatarPreview);
  safeAddListener("profileGender", "change", updateProfileAvatarPreview);

  const _searchBoxEl = document.getElementById("searchBox");
  if (_searchBoxEl) {
    let _searchDebounceTimer = null;
    _searchBoxEl.addEventListener("input", function () {
      clearTimeout(_searchDebounceTimer);
      // 只要一打字，就立刻把畫面切換回課程列表
      showBrowseCourses(false);
      updatePageTitle();
      _searchDebounceTimer = setTimeout(() => filterCourses(), 300);
    });

    _searchBoxEl.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      clearTimeout(_searchDebounceTimer);
      submitSearchFromBar();
    });
  }

  const latestYearToggle = document.getElementById("latestYearOnlyToggle");
  if (latestYearToggle) {
    latestYearToggle.addEventListener("change", function () {
      if (this.checked && latestCourseYear) {
        setFilterRowActiveValue("yearFilterRow", "");
      }
      filterCourses();
    });
  }

  const filterRows = ['deptCategoryFilterRow', 'gradeFilterRow', 'yearFilterRow', 'semesterFilterRow', 'ratingFilterRow', 'sortFilterRow'];
  filterRows.forEach(rowId => {
    const row = document.getElementById(rowId);
    if (!row) return;
    const buttons = row.querySelectorAll('.filter-tag-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', function () {
        buttons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        if (rowId === "yearFilterRow") {
          const latestYearToggle = document.getElementById("latestYearOnlyToggle");
          if (latestYearToggle) latestYearToggle.checked = false;
        }
        if (rowId === "deptCategoryFilterRow") {
          renderDepartmentFilter(this.dataset.value || "");
        }
        filterCourses();
      });
    });
  });

  const searchBox = document.getElementById("searchBox");
  const searchDropdown = document.getElementById("searchDropdownCard");

  if (searchBox && searchDropdown) {
    searchBox.addEventListener("click", function(e) {
      e.stopPropagation();
      searchDropdown.style.display = "block";
    });

    searchBox.addEventListener("focus", function(e) {
      if (e.target.matches(":focus-visible")) {
        searchDropdown.style.display = "block";
      }
    });

    document.addEventListener("click", function(e) {
      if (!searchBox.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = "none";
      }
    });

    const trendingBtns = searchDropdown.querySelectorAll(".trending-tag-btn");

    trendingBtns.forEach(btn => {
      btn.addEventListener("mousedown", function(e) {
        e.preventDefault();

        searchBox.value = this.textContent.trim();
        searchDropdown.style.display = "none";
        filterCourses();
      });
    });
  }

  const notiBtn = document.getElementById("notificationBtn");
  const notiDropdown = document.getElementById("notificationDropdown");

  if (notiBtn && notiDropdown) {
    notiBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = notiDropdown.style.display === "block";
      notiDropdown.style.display = isOpen ? "none" : "block";
      if (!isOpen) {
        refreshNotifications();
      }
    });

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
        const wasUnread = !notificationState.items[index].isRead;

        if (wasUnread) {
          notificationState.items[index].isRead = true;
          notificationState.unreadCount = Math.max(0, notificationState.unreadCount - 1);
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
          if (!Number.isNaN(courseId)) {
            // Set scroll target from data-target attr (parsed from link hash in buildNotificationItem)
            const targetId = item.dataset.target;
            if (targetId) {
              window.__pendingScrollTarget__ = targetId;
              const replyMatch = targetId.match(/^reply-(\d+)-/);
              if (replyMatch) window.__pendingExpandReview__ = replyMatch[1];
            }
            notiDropdown.style.display = "none";
            const cached = allCourses.find((c) => String(c.id) === String(courseId));
            if (cached) {
              openCourseDetail(courseId);
            } else {
              fetch(`/api/courses/${courseId}`)
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(data => {
                  const course = data.course || data;
                  if (course && course.id && !allCourses.find(c => String(c.id) === String(course.id))) {
                    allCourses.push(course);
                  }
                  openCourseDetail(courseId);
                })
                .catch(() => { window.location.href = link; });
            }
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

function updateLatestYearToggleLabel() {
  const label = document.getElementById("latestYearToggleLabel");
  if (label && latestCourseYear) label.textContent = String(latestCourseYear);
}

function setFilterRowActiveValue(rowId, value) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.querySelectorAll(".filter-tag-btn").forEach((button) => {
    button.classList.toggle("active", (button.dataset.value || "") === String(value || ""));
  });
}

function getActiveCourseFilters() {
  const searchTerm = document.getElementById("searchBox")?.value.trim() || "";
  const yearActiveBtn = document.querySelector("#yearFilterRow .filter-tag-btn.active");
  const gradeActiveBtn = document.querySelector("#gradeFilterRow .filter-tag-btn.active");
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

  const latestYearOnly = document.getElementById("latestYearOnlyToggle")?.checked;
  const selectedYear = latestYearOnly && latestCourseYear
    ? String(latestCourseYear)
    : yearActiveBtn?.dataset.value || "";

  return {
    q: searchTerm,
    year: selectedYear,
    grade: gradeActiveBtn?.dataset.value || "",
    department_category: deptCategoryActiveBtn?.dataset.value || "",
    department_group: selectedDepartmentGroup,
    department: selectedDepartment,
    sport_activity: selectedSportActivity,
    min_rating: ratingActiveBtn?.dataset.value || "",
    semester: semActiveBtn?.dataset.value || "",
    sort: sortActiveBtn ? (sortActiveBtn.dataset.sort || sortActiveBtn.dataset.value) : "popular",
  };
}

function resetCourseFiltersToHottest() {
  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.value = "";
  }

  const filterRows = [
    "deptCategoryFilterRow",
    "deptFilterRow",
    "gradeFilterRow",
    "yearFilterRow",
    "semesterFilterRow",
    "ratingFilterRow",
  ];

  filterRows.forEach((rowId) => setFilterRowActiveValue(rowId, ""));

  const latestYearToggle = document.getElementById("latestYearOnlyToggle");
  if (latestYearToggle) {
    latestYearToggle.checked = false;
  }

  const deptSubFilterSelect = document.getElementById("deptSubFilterSelect");
  if (deptSubFilterSelect) {
    restoreDepartmentDropdown();
  }

  renderDepartmentFilter("");

  const sortButtons = document.querySelectorAll("#quickSortMenu .sort-text-btn");
  sortButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sort === "popular" || btn.dataset.value === "popular");
  });

  currentViewMode = "browse";
  courseDetailOrigin = "browse";
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
      aria-label="Previous page"
      ${currentPage === 1 ? "disabled" : ""}
    >
      ‹
    </button>
    ${pageButtons}
    <button
      type="button"
      class="pagination-btn pagination-step"
      onclick="goToCoursePage(${Math.min(totalPages, currentPage + 1)})"
      aria-label="Next page"
      ${currentPage === totalPages ? "disabled" : ""}
    >
      ›
    </button>
  `;
}

function goToCoursePage(page) {
  fetchCoursesPage(page);
  window.scrollTo(0, 0);
}

function renderCourseCodeTags(course) {
  const codes = (course.codes && course.codes.length ? course.codes : [course.code]).filter(Boolean);
  const visibleCodes = codes.slice(0, 1);
  const hiddenCodes = codes.slice(1);
  const codeTags = visibleCodes
    .map((code) => tagSearchButton(code, "course-code course-tag-btn"))
    .join("");

  if (!hiddenCodes.length) return codeTags;

  return `${codeTags}<span class="course-code course-code-more" title="${escapeHtml(hiddenCodes.join("、"))}">+${hiddenCodes.length}</span>`;
}

function renderCourseCards(container, courses, emptyText, origin = 'browse') {

  container.innerHTML = "";

  if (courses.length === 0) {
    container.innerHTML = `<p class="empty-state">${emptyText}</p>`;
    return;
  }

  courses.forEach((course) => {
    const courseCard = document.createElement("div");
    courseCard.className = `course-card ${isCurrentUserAdmin() ? "admin-course-card" : ""}`.trim();
    courseCard.dataset.courseId = String(course.id);
    courseCard.onclick = () => {
      courseDetailOrigin = origin;
      openCourseDetail(course.id);
    };

    const semesterText = `${course.year} S${course.semester}`;
    const isIntercollegiate = (course.department || "").includes("校際");
    const professorDisplay = isIntercollegiate
      ? "校際課程"
      : (course.professor || "");
    const showProfessor = Boolean(professorDisplay);
    const professorLine = showProfessor
      ? `<div class="course-professor-name">${escapeHtml(professorDisplay)}</div>`
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

    const adminActionsHtml = isCurrentUserAdmin() ? `
      <div class="course-admin-actions" onclick="event.stopPropagation();">
        <button class="admin-action-btn" onclick="event.stopPropagation(); openAdminEditById(${course.id})" title="Edit course" aria-label="Edit course">
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
                  ${renderCourseCodeTags(course)}
                </div>
                ${!isCurrentUserAdmin() ? `<button
                  class="course-follow-btn ${course.followed ? "followed" : ""}"
                  data-course-id="${course.id}"
                  onclick="event.stopPropagation(); toggleFollow(${course.id})"
                  aria-label="${course.followed ? "Unfollow course" : "Follow course"}"
                  title="${course.followed ? "Saved" : "Save course"}"
                >
                  ${heartIcon()}
                </button>` : ""}
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
                    <span class="stat-comment">${commentIcon()} ${typeof course.commentTotal !== "undefined" ? course.commentTotal : getCourseCommentTotal(course.id)}</span>
                </div>
                <div class="course-footer-actions">
                  ${!isCurrentUserAdmin() ? `<button class="btn-reviews-card" onclick="event.stopPropagation(); openCourseReviewForm(${course.id})">Add Review</button>` : ''}
                </div>
            </div>
            ${adminActionsHtml}
        `;

    container.appendChild(courseCard);
  });
}

// Filter courses based on search and filters

function filterCourses() {
  const searchTerm = document.getElementById("searchBox")?.value.trim();
  currentViewMode = searchTerm ? 'search' : 'browse';
  updatePageTitle();
  fetchCoursesPage(1);
}

function submitSearchFromBar() {
  const searchBox = document.getElementById("searchBox");
  const searchDropdown = document.getElementById("searchDropdownCard");
  if (!searchBox) return;

  searchBox.value = searchBox.value.trim();
  if (searchDropdown) searchDropdown.style.display = "none";
  
  // 強制把畫面切換回課程列表，且「不」清空搜尋框
  showBrowseCourses(false);
  filterCourses();
  window.scrollTo(0, 0);
}

function searchByTag(tag) {
  const searchBox = document.getElementById("searchBox");
  const value = String(tag || "").trim();
  if (!searchBox || !value) return;

  searchBox.value = value;
  // 強制把畫面切換回課程列表，且「不」清空搜尋框
  showBrowseCourses(false);
  filterCourses();
  window.scrollTo(0, 0);
}

function tagSearchButton(tag, className) {
  const safeTag = escapeHtml(tag);
  const encodedTag = encodeURIComponent(String(tag || ""));
  return `<button type="button" class="${className}" onclick="event.stopPropagation(); searchByTag(decodeURIComponent('${encodedTag}'))">${safeTag}</button>`;
}

document.addEventListener("DOMContentLoaded", function() {
  const sortBtns = document.querySelectorAll('.sort-text-btn');
  sortBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      sortBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      filterCourses();
    });
  });
});

function sortCourses(courses, sortBy) {
  const sorted = [...courses];
  return [...courses];
}

// Toggle follow
async function toggleFollow(courseId) {
  if (!currentUser) {
    alert("Please login to save courses.");
    openLoginModal();
    return;
  }
  if (isCurrentUserAdmin()) {
    alert("Admin accounts cannot save courses.");
    return;
  }

  const course = allCourses.find((c) => String(c.id) === String(courseId))
                || favoritesCache.find((c) => String(c.id) === String(courseId));

  if (!course) {
    try {
      const data = await apiRequest(`/api/courses/${courseId}/favorite`, { method: "POST" });
      return;
    } catch(e) { console.error("Course not found for toggle"); return; }
  }


  const prevFollowed = course.followed;
  const prevSaveCount = course.saveCount || 0;
  course.followed = !prevFollowed;
  course.saveCount = prevFollowed ? Math.max(0, prevSaveCount - 1) : prevSaveCount + 1;
  updateFollowButtonsForCourse(courseId, course.followed, course.saveCount);

  try {
    const data = await apiRequest(`/api/courses/${courseId}/favorite`, {
      method: "POST",
    });
    course.followed = Boolean(data.followed);
    course.saveCount = data.saveCount ?? course.saveCount;
    updateFollowButtonsForCourse(courseId, course.followed, course.saveCount);

    if (course.followed) {
      if (!favoritesCache.some(c => String(c.id) === String(courseId))) {
        favoritesCache.push({ ...course });
      } else {
        const idx = favoritesCache.findIndex(c => String(c.id) === String(courseId));
        if (idx !== -1) favoritesCache[idx] = { ...course };
      }
    } else {
      favoritesCache = favoritesCache.filter(c => String(c.id) !== String(courseId));
    }
  } catch (error) {
    course.followed = prevFollowed;
    course.saveCount = prevSaveCount;
    updateFollowButtonsForCourse(courseId, course.followed, course.saveCount);
    alert(error.message);
    if (error.message.toLowerCase().includes("authentication")) {
      openLoginModal();
    }
  }

  if (document.getElementById("favoritesPage")?.style.display === "block") {
    renderFavorites();
  }
}

function updateFollowButtonsForCourse(courseId, followed, saveCount) {
  document.querySelectorAll(`.course-follow-btn[data-course-id="${courseId}"]`).forEach((btn) => {
    btn.classList.toggle("followed", followed);
    btn.setAttribute("aria-label", followed ? "Unsave course" : "Save course");
    btn.title = followed ? "Saved" : "Save course";
  });
  const countSpan = document.getElementById(`save-count-${courseId}`);
  if (countSpan) countSpan.textContent = saveCount;
  syncDetailFollowButton(courseId);
  updateDetailSocialStats(courseId);
}

function syncDetailFollowButton(courseId) {
  const detailFollowBtn = document.getElementById("detailFollowBtn");
  const course = allCourses.find((c) => String(c.id) === String(courseId));
  if (!detailFollowBtn || !course) return;

  if (isCurrentUserAdmin()) {
    detailFollowBtn.style.display = "none";
    return;
  }
  detailFollowBtn.style.display = "";
  detailFollowBtn.className = `course-follow-btn detail-follow-btn ${course.followed ? "followed" : ""}`;
  detailFollowBtn.innerHTML = heartIcon();
  detailFollowBtn.setAttribute("aria-label", course.followed ? "Unsave course" : "Save course");
  detailFollowBtn.title = course.followed ? "Saved" : "Save course";
  detailFollowBtn.onclick = (event) => {
    event.stopPropagation();
    toggleFollow(courseId);
  };
}

function formatCourseType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "elective" || normalized === "選修") return "Elective";
  if (normalized === "compulsory" || normalized === "必修") return "Compulsory";
  return "Other";
}

function renderDetailOfferingHistory(course) {
  const isIntercollegiate = (course.department || "").includes("校際");
  const latestTermEl = document.getElementById("detailLatestTerm");
  const historyEl = document.getElementById("detailHistoryTerms");
  const historyTerms = Array.isArray(course.historyTerms) ? course.historyTerms : [];
  const fallbackLatest = course.latestTerm || (course.year && course.semester ? `${course.year}-S${course.semester}` : "-");

  if (latestTermEl) {
    latestTermEl.textContent = historyTerms[0]?.label || fallbackLatest;
  }

  if (historyEl) {
    historyEl.innerHTML = historyTerms.length
      ? historyTerms
          .map((term) => {
            const classTimeChanged = (term.classTime || "-") !== (course.classTime || "-");
            const locationChanged = (term.location || "-") !== (course.location || "-");
            const classTimeRow = classTimeChanged
              ? `
                <span class="detail-history-popover-row">
                  <span class="detail-history-popover-title">Class Time</span>
                  <span>${escapeHtml(term.classTime || "-")}</span>
                </span>
              `
              : "";
            const locationRow = locationChanged
              ? `
                <span class="detail-history-popover-row">
                  <span class="detail-history-popover-title">Room</span>
                  <span>${escapeHtml(term.location || "-")}</span>
                </span>
              `
              : "";

            return `
              <button type="button" class="detail-history-pill" data-tag="${escapeHtml(term.searchValue || term.label)}" onclick="event.stopPropagation(); searchByTag(this.dataset.tag)">
                ${escapeHtml(term.label)}
                <span class="detail-history-popover" role="tooltip">
                  <span class="detail-history-popover-row">
                    <span class="detail-history-popover-title">Professor</span>
                    <span>${isIntercollegiate ? "校際課程" : escapeHtml(term.professorText || "-")}</span>
                  </span>
                  ${classTimeRow}
                  ${locationRow}
                </span>
              </button>
            `;
          })
          .join("")
      : `<span class="detail-history-empty">-</span>`;
  }
}

function splitProfessorNames(professorText) {
  return String(professorText || "")
    .split(/[、,，]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function renderDetailProfessor(professorText, expanded = false) {
  const professorEl = document.getElementById("detailCourseProfessor");
  if (!professorEl) return;

  const names = splitProfessorNames(professorText);
  if (!names.length) {
    professorEl.classList.remove("is-expanded");
    professorEl.textContent = "-";
    return;
  }

  if (names.length <= 2) {
    professorEl.classList.remove("is-expanded");
    professorEl.textContent = names.join("、");
    return;
  }

  const visibleNames = expanded ? names : names.slice(0, 2);
  const buttonLabel = expanded ? "Show less" : `+${names.length - 2}`;
  professorEl.innerHTML = `
    <span class="detail-professor-names">${escapeHtml(visibleNames.join("、"))}</span>
    <button type="button" class="detail-professor-more-btn" onclick="toggleDetailProfessor(event)">${escapeHtml(buttonLabel)}</button>
  `;
  professorEl.classList.toggle("is-expanded", expanded);
  professorEl.dataset.fullProfessor = professorText;
  professorEl.dataset.expanded = expanded ? "true" : "false";
}

function toggleDetailProfessor(event) {
  event.stopPropagation();
  const professorEl = document.getElementById("detailCourseProfessor");
  if (!professorEl) return;
  renderDetailProfessor(professorEl.dataset.fullProfessor || professorEl.textContent, professorEl.dataset.expanded !== "true");
}

function renderDetailTags(course) {
  const tagList = document.getElementById("detailTagList");
  if (!tagList) return;

  const tags = course.tags?.length ? course.tags : [];
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
  const course = allCourses.find((item) => String(item.id) === String(courseId));
  if (course && Number.isFinite(Number(course.commentTotal))) {
    return Number(course.commentTotal);
  }
  return reviews.length;
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

  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "none";
  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";

  document.getElementById("coursesContainer").style.display = "none";
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "none";
  document.getElementById("courseDetailPage").style.display = "none";
  document.getElementById("activityPage").style.display = "none";
  document.getElementById("favoritesPage").style.display = "block";

  if (favoritesCache && favoritesCache.length > 0) {
    renderFavorites();
    return;
  }

  const container = document.getElementById("favoritesContainer");
  if (container) container.innerHTML = '<p class="empty-state">Loading...</p>';

  apiRequest("/api/user/favorites")
    .then(data => {
      favoritesCache = data.courses || [];
      favoritesCache.forEach(fav => {
        const c = allCourses.find(x => String(x.id) === String(fav.id));
        if (c) { c.followed = true; c.saveCount = fav.saveCount; }
      });
      renderFavorites();
    })
    .catch(() => {
      favoritesCache = allCourses.filter(c => c.followed === true);
      renderFavorites();
    });
}

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

  // 記住上次的 tab，並正確恢復顯示
  switchActivityTab(activityState.activeTab);
  if (!activityState.loaded) {
    loadActivityData();
  } else {
    renderPersonalActions();
    renderInteractions();
    updateActivityInteractionBadge();
  }
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

// 🌟 修正版 1：清除給幾分細項，並將 reviewId 藏進卡片屬性中
function buildPersonalActionCard(item) {
  const typeLabel = {
    favorite: '<span class="activity-type-badge badge-favorite">Saved</span>',
    review:   '<span class="activity-type-badge badge-review">Review</span>',
    reaction: '<span class="activity-type-badge badge-reaction">Reacted</span>',
    reply:    '<span class="activity-type-badge badge-reply">Reply</span>',
  }[item.type] || "";
  
  const snippetHtml = item.reviewSnippet
    ? `<p class="activity-card-snippet">"${escapeHtml(item.reviewSnippet)}"</p>` : "";
  const courseLink = item.courseId ? `data-course-id="${item.courseId}"` : "";
  
  // reply 類型：scroll 到 reply 本身；其他：scroll 到 review
  let targetAttr = "";
  if (item.type === "reply" && item.reviewId && item.replyId) {
    targetAttr = `data-target="reply-${item.reviewId}-${item.replyId}"`;
  } else if (item.reviewId) {
    targetAttr = `data-target="review-${item.reviewId}"`;
  }

  return `
    <div class="activity-card" ${courseLink} ${targetAttr} onclick="handleActivityCardClick(this)" role="button" tabindex="0" style="cursor: pointer;">
      <div class="activity-card-icon">${escapeHtml(item.icon || "📝")}</div>
      <div class="activity-card-body">
        <div class="activity-card-top">${typeLabel}<span class="activity-card-time">${escapeHtml(item.createdAt || "")}</span></div>
        <p class="activity-card-message">${item.message}</p>
        ${snippetHtml}
        <span class="activity-card-course-code">${escapeHtml(item.courseCode || "")}</span>
      </div>
      <div class="activity-card-arrow">›</div>
    </div>`;
}

function buildInteractionCard(item) {
  const unreadDot = !item.isRead ? `<span class="activity-unread-dot"></span>` : "";
  const cardClass = `activity-card interaction-card${item.isRead ? "" : " unread"}`;
  const linkAttr = item.link ? `data-link="${escapeHtml(item.link)}"` : "";
  // Parse hash anchor from link (e.g. /courses/42#review-7 or #reply-7-99)
  let targetAttr = "";
  if (item.link) {
    const hashMatch = String(item.link).match(/#(review-\d+|reply-\d+-\d+)$/);
    if (hashMatch) targetAttr = `data-target="${escapeHtml(hashMatch[1])}"`;
  }
  return `
    <div class="${cardClass}" data-id="${escapeHtml(item.id)}" ${linkAttr} ${targetAttr}
         onclick="handleInteractionCardClick(this)" role="button" tabindex="0">
      <div class="activity-card-icon">🔔</div>
      <div class="activity-card-body">
        <p class="activity-card-message">${escapeHtml(item.message)}</p>
        <span class="activity-card-time">${escapeHtml(item.createdAt)}</span>
      </div>
      ${unreadDot}
    </div>`;
}

// 🌟 修正版 2：點擊卡片跳轉進入課程詳細頁，並在資料載入後，自動滾動到該留言並套用閃爍特效
async function handleActivityCardClick(el) {
  const courseId = parseInt(el.dataset.courseId);
  const targetId = el.dataset.target; // 例如 "review-45"
  if (!courseId) return;

  // 設定好 origin，再隱藏 activity 頁面跳到課程詳情
  courseDetailOrigin = 'activity';
  document.getElementById("activityPage").style.display = "none";

  // 確保課程資料在 allCourses 裡
  if (!allCourses.find(c => String(c.id) === String(courseId))) {
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) throw new Error("Course not found.");
      const data = await res.json();
      const course = data.course || data;
      if (course && course.id) allCourses.push(course);
    } catch (err) {
      alert("無法載入課程資料：" + err.message);
      document.getElementById("activityPage").style.display = "block";
      return;
    }
  }

  // 如果有 targetId，讓 loadReviews 渲染完後立刻 scroll + 閃爍
  if (targetId) {
    window.__pendingScrollTarget__ = targetId;
    // reply 類型（格式 reply-{reviewId}-{replyId}）需要先記下 reviewId 展開 replies group
    const replyMatch = targetId.match(/^reply-(\d+)-/);
    if (replyMatch) {
      window.__pendingExpandReview__ = replyMatch[1];
    }
  }

  openCourseDetail(courseId);
}

function handleInteractionCardClick(el) {
  const link = el.dataset.link;
  const id = el.dataset.id;
  const targetId = el.dataset.target; // e.g. "review-45" or "reply-45-99"
  if (id) {
    markSingleInteractionRead(id);
    el.classList.remove("unread");
    const dot = el.querySelector(".activity-unread-dot");
    if (dot) dot.remove();
  }
  if (link && link.includes("/courses/")) {
    const match = link.match(/\/courses\/(\d+)/);
    if (match) {
      const courseId = parseInt(match[1]);
      if (targetId) {
        window.__pendingScrollTarget__ = targetId;
        const replyMatch = targetId.match(/^reply-(\d+)-/);
        if (replyMatch) window.__pendingExpandReview__ = replyMatch[1];
      }
      navigateToCourseFromActivity(courseId);
    }
  }
}

async function navigateToCourseFromActivity(courseId) {
  courseDetailOrigin = 'activity';
  document.getElementById("activityPage").style.display = "none";

  const cached = allCourses.find((c) => String(c.id) === String(courseId));
  if (cached) {
    openCourseDetail(courseId);
    return;
  }

  try {
    const res = await fetch(`/api/courses/${courseId}`);
    if (!res.ok) throw new Error("Course not found.");
    const data = await res.json();
    const course = data.course || data;
    if (course && course.id) {
      if (!allCourses.find((c) => String(c.id) === String(course.id))) {
        allCourses.push(course);
      }
      openCourseDetail(course.id);
    }
  } catch (err) {
    alert("無法載入課程資料：" + err.message);
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

function showBrowseCourses(clearSearch = true) {
  document.getElementById("favoritesPage").style.display = "none";
  document.getElementById("activityPage").style.display = "none";
  document.getElementById("courseDetailPage").style.display = "none";

  document.getElementById("pageHeading").style.display = "";
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "";

  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";

  document.getElementById("coursesContainer").style.display = "";
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "";

  document.body.classList.remove("detail-open");

  const searchBox = document.getElementById("searchBox");
  const hasSearch = searchBox && searchBox.value.trim() !== "";
  
  if (clearSearch !== false && hasSearch) {
    searchBox.value = "";
    updatePageTitle();
    filterCourses();
  } else {
    updatePageTitle();
    // 如果正在搜尋狀態，就不要跳回原本的捲動位置
    if (!hasSearch) restoreCourseListPosition();
  }
}

function showHomePage() {
  document.body.classList.remove("detail-open");
  currentCourseId = null;
  showBrowseCourses();
  const dropdown = document.getElementById("notificationDropdown");
  if (dropdown) dropdown.style.display = "none";
  const userDropdown = document.getElementById("userDropdown");
  if (userDropdown) userDropdown.hidden = true;
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
    favorites.sort((a, b) => {
      const aPopularity = (a.saveCount || 0) + (a.commentTotal || 0);
      const bPopularity = (b.saveCount || 0) + (b.commentTotal || 0);
      return bPopularity - aPopularity;
    });
  } else if (sortBy === "latest") {
    favorites.sort((a, b) => (b.year - a.year) || (b.semester - a.semester));
  } else if (sortBy === "rating") {
    favorites.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  const container = document.getElementById("favoritesContainer");
  if (container) {
    renderCourseCards(
      container,
      favorites,
      "No favorite courses yet",
      "favorites"
    );
  }
}

// Login modal
window.openLoginModal = function(showWelcome = true) {
  const modal = document.getElementById("loginModal");
  if (!modal) return;

  modal.style.display = "block";
  modal.classList.add("login-page-overlay");
  setTimeout(() => {
    modal.classList.add("active");
  }, 10);

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

  const navbar = document.querySelector(".navbar");
  if (navbar) {
    navbar.classList.remove("logo-shifted");
  }
}

window.continueAsGuest = function() {
  document.getElementById("navBlock").style.display = "block";
  document.getElementById("mainContentBlock").style.display = "block";
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
  }
  currentUser = null;
  updateAuthUI();
  document.getElementById("navBlock").style.display = "none";
  document.getElementById("mainContentBlock").style.display = "none";
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
    updateBackToTopButton();
    refreshNotifications();
  } else {
    document.getElementById("navBlock").style.display = "none";
    document.getElementById("mainContentBlock").style.display = "none";
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

  if (!document.body.classList.contains("detail-open")) {
    courseReturnState = { courseId: String(courseId), scrollY: window.scrollY };
  }

  currentCourseId = courseId;
  const reviews = getReviewsForCourse(courseId);
  const averageRating = getAverageRating(reviews, course.rating);

  const detailCourseTags = document.querySelector(".detail-course-tags");
  const detailCodes = (course.codes && course.codes.length ? course.codes : [course.code]).filter(Boolean);
  if (detailCourseTags) {
    detailCourseTags.innerHTML = detailCodes
      .map((code) => `
        <button type="button" class="detail-course-code" data-tag="${escapeHtml(code)}" onclick="event.stopPropagation(); searchByTag(this.dataset.tag)">
          ${escapeHtml(code)}
        </button>
      `)
      .join("");
  }
  document.getElementById("detailCourseTitle").textContent = course.title;
  syncDetailFollowButton(courseId);
  document.getElementById("detailCourseTitleZh").textContent = course.titleZh;
  const isIntercollegiate = (course.department || "").includes("校際");
  renderDetailProfessor(isIntercollegiate ? "校際課程" : (course.professor || "-"));
  document.getElementById("detailCourseDepartment").textContent = course.department;
  document.getElementById("detailCourseCredits").textContent = course.credits;
  document.getElementById("detailCourseGrade").textContent = course.grade ? `${course.grade}年級` : "-";
  renderDetailOfferingHistory(course);
  document.getElementById("detailClassTime").textContent = course.classTime || "-";
  document.getElementById("detailClassLocation").textContent = course.location || "-";
  document.getElementById("detailCourseRequirement").textContent = formatCourseType(course.requirement || course.courseType);
  renderDetailTags(course);
  updateDetailSocialStats(courseId);
  document.getElementById("detailRatingValue").textContent = averageRating.toFixed(1);
  const detailStarsEl = document.getElementById("detailStars");
  if (detailStarsEl) detailStarsEl.innerHTML = generateStars(averageRating);
  document.getElementById("detailReviewCount").textContent = `Based on ${reviews.length} review${reviews.length !== 1 ? "s" : ""}`;

  renderRatingBreakdown(reviews);
  loadReviews(courseId);

  document.body.classList.add("detail-open");
  const navLogoBtn = document.getElementById("navLogoBtn");
  if (navLogoBtn) navLogoBtn.setAttribute("aria-label", "Back to courses");

  // 隱藏所有其他 section，避免版面疊在一起
  document.getElementById("pageHeading").style.display = "none";
  document.getElementById("favoritesPage").style.display = "none";
  document.getElementById("activityPage").style.display = "none";
  if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "none";
  if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";
  if (document.getElementById("adminAddCoursePanel")) document.getElementById("adminAddCoursePanel").style.display = "none";
  if (document.getElementById("adminEditCoursePanel")) document.getElementById("adminEditCoursePanel").style.display = "none";

  document.getElementById("coursesContainer").style.display = "none";
  const pagination = document.getElementById("coursesPagination");
  if (pagination) pagination.style.display = "none";
  document.getElementById("courseDetailPage").style.display = "block";

  // 有 pendingScrollTarget 時不 scroll to top，讓 loadReviews 渲染後自己 scroll
  if (!window.__pendingScrollTarget__) {
    window.scrollTo(0, 0);
  }

  const backBtn = document.querySelector(".back-button");
  const navLogoBack = document.querySelector(".nav-logo-back");

  // 1. 先根據來源決定正確的文字
  let labelText = "Back to Courses"; 
  if (courseDetailOrigin === "favorites") {
    labelText = "Back to Favorites";
  } 
  else if (courseDetailOrigin === "activity") {
    labelText = "Back to Activity";
  } 
  else if (currentViewMode === "search") {
    labelText = "Back to Courses"; 
  }

  // 2. 更新頁面內部的返回按鈕（雖然被 CSS 隱藏了，但維持邏輯完整）
  if (backBtn) {
    backBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5"></path>
        <path d="m12 19-7-7 7-7"></path>
      </svg>
      ${labelText}
    `;
    backBtn.onclick = closeCourseDetail;
  }

  // 3. 關鍵修正：同步更新導覽列商標上真正顯示出來的返回文字！
  if (navLogoBack) {
    navLogoBack.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5"></path>
        <path d="m12 19-7-7 7-7"></path>
      </svg>
      ${labelText}
    `;
  }
    backBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5"></path>
        <path d="m12 19-7-7 7-7"></path>
      </svg>
      ${labelText}
    `;
    backBtn.onclick = closeCourseDetail;
  }


function restoreCourseListPosition() {
  const targetCard = courseReturnState.courseId
    ? document.querySelector(`[data-course-id="${CSS.escape(String(courseReturnState.courseId))}"]`)
    : null;

  if (targetCard) {
    targetCard.scrollIntoView({ block: "center", behavior: "auto" });
    return;
  }

  window.scrollTo({ top: courseReturnState.scrollY || 0, behavior: "auto" });
}

function openCourseReviewForm(courseId) {
  if (isCurrentUserAdmin()) return;
  openCourseDetail(courseId);
  openReviewForm();
}

function handleNavLogoClick() {
  resetCourseFiltersToHottest();
  showHomePage();
  fetchCoursesPage(1).catch((e) => console.warn('fetchCoursesPage failed on logo click', e));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeCourseDetail() {
  document.getElementById("courseDetailPage").style.display = "none";
  document.body.classList.remove("detail-open");
  const navLogoBtn = document.getElementById("navLogoBtn");
  if (navLogoBtn) navLogoBtn.setAttribute("aria-label", "Course Review Platform");

  if (document.getElementById("adminAddCoursePanel")) {
    document.getElementById("adminAddCoursePanel").style.display = isCurrentUserAdmin() ? "block" : "none";
  }
  if (document.getElementById("adminEditCoursePanel")) {
    document.getElementById("adminEditCoursePanel").style.display = "none";
  }

  currentCourseId = null;
  renderAdminCoursePanel(null);

  if (courseDetailOrigin === 'favorites') {
    courseDetailOrigin = 'browse';
    showFavorites();
    window.scrollTo({ top: courseReturnState.scrollY || 0, behavior: "auto" });
  } else if (courseDetailOrigin === 'activity') {
    courseDetailOrigin = 'browse';
    showActivity();
    window.scrollTo({ top: courseReturnState.scrollY || 0, behavior: "auto" });
  } else {
    courseDetailOrigin = 'browse';
    document.getElementById("pageHeading").style.display = "";
    if (document.getElementById("quickSortMenu")) document.getElementById("quickSortMenu").style.display = "";
    if (document.getElementById("filterPanel")) document.getElementById("filterPanel").style.display = "none";
    document.getElementById("coursesContainer").style.display = "";
    const pagination = document.getElementById("coursesPagination");
    if (pagination) pagination.style.display = "";
    requestAnimationFrame(restoreCourseListPosition);
  }
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

  for (let rating = 5; rating >= 1; rating--) {
    const count = reviews.filter((r) => r.rating === rating).length;
    const percent = total > 0 ? (count / total) * 100 : 0;
    const row = document.createElement("div");
    row.className = "rating-breakdown-row";
    row.innerHTML = `

    `;
    breakdown.appendChild(row);
  }

  renderDimBreakdown(reviews);
}

function renderDimBreakdown(reviews) {
  const container = document.getElementById("dimBreakdown");
  if (!container) return;

  const dims = [
    { key: "ratingQuality",   label: "Quality", img: "/static/icons/award.png" },
    { key: "ratingSweetness", label: "Sweetness", img: "/static/icons/candy.png" },
    { key: "ratingCoolness",  label: "Coolness", img: "/static/icons/cool.png"  },
    { key: "ratingSolidity",  label: "Solidity", img: "/static/icons/bicep.png" },
  ];

  const rated = reviews.filter(r => r.ratingQuality || r.ratingSweetness || r.ratingCoolness || r.ratingSolidity);

  container.innerHTML = `
    <div class="dim-breakdown-title">Dimension Averages</div>
    ${dims.map(d => {
      const avg = rated.length > 0 ? rated.reduce((s, r) => s + (r[d.key] || 0), 0) / rated.length : 0;
      const pct = (avg / 5) * 100;
      const iconHtml = d.emoji
        ? `<span class="dim-bar-emoji">${d.emoji}</span>`
        : `<img src="${d.img}" class="dim-bar-icon">`;
      const scoreText = rated.length > 0 ? avg.toFixed(1) : "-";
      return `
        <div class="dim-breakdown-row">
          <span class="dim-bar-label">${iconHtml} ${d.label}</span>
          <div class="dim-ratings">
            <div class="dim-bar-track">
              <span class="dim-bar-fill" style="width:${pct}%"></span>
            </div>
            <span class="dim-bar-score">${scoreText}</span>
          </div>
        </div>`;
    }).join("")}
  `;
}

// Load reviews
function loadReviews(courseId, onRendered) {
  const cachedId = String(courseId);

  // Cache miss：自己去 fetch，填完 cache 再重跑
  if (!courseReviews[cachedId] || courseReviews[cachedId].length === 0) {
    const initialKey = cachedId;
    if (window.__INITIAL_REVIEWS__ && window.__INITIAL_REVIEWS__[initialKey]) {
      courseReviews[cachedId] = window.__INITIAL_REVIEWS__[initialKey];
    } else {
      fetch(`/api/courses/${courseId}/reviews`)
        .then(res => res.json())
        .then(data => {
          courseReviews[cachedId] = data.reviews || [];
          loadReviews(courseId, onRendered); // 填完 cache 重跑，這次有資料
        })
        .catch(err => console.error("loadReviews fetch failed:", err));
      return; // 等 fetch 回來再渲染
    }
  }

  const reviews = getReviewsForCourse(courseId);

  const reviewsList = document.getElementById("reviewsList");
  reviewsList.innerHTML = "";

  const addReviewBtn = document.querySelector(".btn-add-review");
  if (addReviewBtn) {
    if (isCurrentUserAdmin()) {
      addReviewBtn.style.display = "none";
    } else {
      addReviewBtn.style.display = "";
      const hasIReviewed = currentUser && reviews.some(r => r.author === getDisplayName(currentUser));
      if (hasIReviewed) {
        addReviewBtn.disabled = true;
        addReviewBtn.style.opacity = "0.5";
        addReviewBtn.style.cursor = "not-allowed";
        addReviewBtn.textContent = "Already Reviewed";
      } else {
        addReviewBtn.disabled = false;
        addReviewBtn.style.opacity = "1";
        addReviewBtn.style.cursor = "pointer";
        addReviewBtn.textContent = "Write a Review";
      }
    }
  }

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
    reviewItem.id = `review-${review.id}`;

    const DIM_ICONS = {
      ratingQuality:   { img: "/static/icons/award.png" },
      ratingSweetness: { img: "/static/icons/candy.png" },
      ratingCoolness:  { img: "/static/icons/cool.png" },
      ratingSolidity:  { img: "/static/icons/bicep.png" },
    };
    const DIM_LABELS = { ratingQuality: "Quality", ratingSweetness: "Sweetness", ratingCoolness: "Coolness", ratingSolidity: "Solidity" };

    const dimRatingsHtml = (review.ratingQuality || review.ratingSweetness || review.ratingCoolness || review.ratingSolidity) ? `
      <div class="review-dim-ratings" id="dim-box-${review.id}">
        <div class="review-dim-header-label">DIMENSION RATINGS</div>
        <div class="review-dim-body-grid">
          ${Object.entries(DIM_LABELS).map(([key, label]) => {
            const v = review[key] || 0;
            const icon = DIM_ICONS[key];
            const iconHtml = icon.emoji
              ? `<span class="dim-icon-unit dim-emoji-unit">${icon.emoji}</span>`
              : `<img src="${icon.img}" class="dim-icon-unit">`;
            const iconsRow = Array.from({length: 5}, (_, i) =>
              `<span class="dim-icon-wrap ${i < v ? "active" : "inactive"}"
                data-review="${review.id}" data-dim="${key}" data-val="${i+1}"
                onclick="handleDimClick(event, '${review.id}', '${key}', ${i+1})"
                style="cursor:default;">${iconHtml}</span>`
            ).join("");
            return `<div class="dim-row"><span class="dim-label">${label}</span><span class="dim-icons-row" id="dim-row-${review.id}-${key}">${iconsRow}</span></div>`;
          }).join("")}
        </div>
      </div>` : "";
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
                  <span class="review-date">${escapeHtml(review.date)}${review.updatedAt ? `<span class="review-edited-tag"> · Edited at ${review.updatedAt}</span>` : ''}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  ${myActionsHtml}

                </div>
            </div>

            ${dimRatingsHtml}

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

  // 渲染完後執行 scroll/highlight callback（供 activity 跳轉使用）
  if (typeof onRendered === "function") onRendered();

  // 消費全域的 pendingScrollTarget（handleActivityCardClick 設定的）
  const pendingTarget = window.__pendingScrollTarget__;
  if (pendingTarget) {
    window.__pendingScrollTarget__ = null;
    const expandReviewId = window.__pendingExpandReview__;
    window.__pendingExpandReview__ = null;

    const doScroll = () => {
      requestAnimationFrame(() => {
        const el = document.getElementById(pendingTarget);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("review-highlight-flash");
          el.addEventListener("animationend", () => {
            el.classList.remove("review-highlight-flash");
          }, { once: true });
        }
      });
    };

    // reply 需要先展開對應的 replies group，再 scroll
    if (expandReviewId) {
      const groupKey = `${expandReviewId}:root`;
      expandedReplyGroups.add(groupKey);
      loadReviews(courseId, doScroll); // 重新渲染讓 replies 出現
    } else {
      doScroll();
    }
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
      const isMyReply = currentUser && reply.author === getDisplayName(currentUser);

      const myReplyActionsHtml = isMyReply ? `
        <div class="my-review-actions" style="margin-left: auto;">
          <button type="button" class="icon-btn-small" onclick="editReply('${reviewId}', '${reply.id}')" title="edit"><img src="../static/icons/edit.png" width="20" height="20"></button>
          <button type="button" class="icon-btn-small" onclick="deleteReply('${reviewId}', '${reply.id}')" title="delete"><img src="../static/icons/delete.png" width="20" height="20"></button>
        </div>
      ` : "";

      return `
        <div class="reply-thread" id="reply-${reviewId}-${reply.id}">
          <div class="reply-item">
            <div class="reply-content" style="width: 100%;">
              <div class="reply-meta" style="display: flex; align-items: center; width: 100%;">
                <span class="reply-avatar ${getGenderClass(reply.avatar?.gender)}">${avatarIcon(reply.avatar || getDefaultProfile(reply.author))}</span>
                <strong>${escapeHtml(reply.author)}</strong>
                <span style="margin-left: 8px;">${escapeHtml(reply.date)}${reply.updatedAt ? `<span class="review-edited-tag"> · 編輯於 ${reply.updatedAt}</span>` : ''}</span>
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
    activityState.loaded = false; // 強制下次回 activity 時重新 fetch
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

function renderReactionControl(item, reviewId, replyId = null) {
  const targetArgs = replyId ? `'${reviewId}', '${replyId}'` : `'${reviewId}'`;
  const isReply = !!replyId;
  const paletteButtons = REACTION_OPTIONS.map(
    (reaction) =>
      `<button type="button" class="${isReply ? 'reply-emoji-btn' : ''}" onclick="selectReviewEmoji(event, ${targetArgs}, '${reaction}')">${reaction}</button>`,
  ).join("");

  const replyAttr = replyId ? `data-reply-id="${replyId}"` : "";
  const innerHtml = isCurrentUserAdmin()
    ? `<span class="like-count-num">${item.likes ?? 0} reactions</span>`
    : `<button
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
      </div>`;

  return `
    <div class="reaction-container" data-review-id="${reviewId}" ${replyAttr}>
      ${innerHtml}
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
    // 更新畫面上的課程卡片與明細（若正在檢視）
    updateCourseCardDisplay(allCourses[index]);
    if (String(currentCourseId) === String(course.id)) {
      refreshDetailRatingSummary(course.id);
      renderDetailTags(allCourses[index]);
    }
  }
}

function updateCourseCardDisplay(course) {
  if (!course) return;
  // 更新卡片上的 inline 評分
  const card = document.querySelector(`[data-course-id="${CSS.escape(String(course.id))}"]`);
  if (card) {
    const ratingEl = card.querySelector('.course-rating-inline');
    if (ratingEl && typeof course.rating === 'number') {
      ratingEl.innerHTML = `${starIcon()}${Number(course.rating).toFixed(1)}`;
    }
    const commentEl = card.querySelector('.course-reviews-count .stat-comment');
    if (commentEl) {
      const commentTotal = typeof course.commentTotal !== 'undefined' ? course.commentTotal : getCourseCommentTotal(course.id);
      commentEl.innerHTML = `${commentIcon()} ${commentTotal}`;
    }
    const saveCountEl = card.querySelector('.save-count-num');
    if (saveCountEl) saveCountEl.textContent = course.saveCount ?? 0;
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

  if (target && target.liked && target.reaction) {
    try {
        await persistReaction(reviewId, "", replyId);
        loadReviews(currentCourseId);
    } catch (error) { alert(error.message); }
  } else {
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
  Object.keys(selectedDimRatings).forEach(d => { selectedDimRatings[d] = 0; updateDimStars(d); });
  document.getElementById("reviewForm").reset();
  document.getElementById("reviewText").focus();
}

function closeReviewModal() {
  document.getElementById("reviewForm").style.display = "none";
  document.getElementById("reviewForm").reset();
  selectedRating = 0;
  Object.keys(selectedDimRatings).forEach(d => { selectedDimRatings[d] = 0; updateDimStars(d); });
}

// Set rating for a single dimension
function setDimRating(dim, value) {
  selectedDimRatings[dim] = value;
  updateDimStars(dim);
}

function previewDimRating(dim, value) {
  const container = document.getElementById(`stars${dim}`);
  if (!container) return;
  container.querySelectorAll(".star").forEach((s, i) => {
    s.classList.toggle("active", i < value);
  });
}

function updateDimStars(dim, displayValue) {
  const val = displayValue !== undefined ? displayValue : selectedDimRatings[dim];
  const container = document.getElementById(`stars${dim}`);
  if (!container) return;
  container.querySelectorAll(".star").forEach((s, i) => {
    s.classList.toggle("active", i < val);
  });
}

// Legacy wrappers (kept for safety)
function setRating(rating) { selectedRating = rating; }
function previewRating(rating) {}
function updateStarDisplay() {}

// Submit review
async function submitReview(event) {
  event.preventDefault();

  if (!currentUser) {
    alert("Please login to submit a review.");
    return;
  }

  if (isCurrentUserAdmin()) {
    alert("Admin accounts cannot submit reviews.");
    return;
  }

  if (selectedDimRatings.Quality === 0 || selectedDimRatings.Sweetness === 0 ||
      selectedDimRatings.Coolness === 0 || selectedDimRatings.Solidity === 0) {
    alert("Please rate all four dimensions.");
    return;
  }

  const reviewText = document.getElementById("reviewText").value;
  const course = allCourses.find((c) => String(c.id) === String(currentCourseId));

  try {
    const result = await apiRequest(`/api/courses/${currentCourseId}/review`, {
      method: "POST",
      body: JSON.stringify({
        ratingQuality: selectedDimRatings.Quality,
        ratingSweetness: selectedDimRatings.Sweetness,
        ratingCoolness: selectedDimRatings.Coolness,
        ratingSolidity: selectedDimRatings.Solidity,
        text: reviewText,
        language: "English",
      }),
    });

    if (!courseReviews[currentCourseId]) {
      courseReviews[currentCourseId] = [];
    }
    courseReviews[currentCourseId].unshift(result.review);

    if (result.course) {
      replaceCourseInState(result.course);
    }

    alert("Review submitted successfully!");
    closeReviewModal();
    activityState.loaded = false; // 強制下次回 activity 時重新 fetch

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
    submitButton.textContent = "Login";
    registerFields.style.display = "none";
    registerOnlyFields.forEach((field) => {
      field.style.display = "none";
      field.required = false;
    });
  } else {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    submitButton.dataset.mode = "register";
    submitButton.textContent = "Create Account";
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

window.toggleFilterPanel = function() {
  const panel = document.getElementById('filterPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

document.addEventListener("DOMContentLoaded", function() {
  const filterOptions = document.querySelectorAll('.filter-options');

  filterOptions.forEach(group => {
    const pills = group.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        filterCourses();
      });
    });
  });
});


window.toggleFilterPanel = function() {
  const panel = document.getElementById('filterPanel');
  const courseDetailPage = document.getElementById("courseDetailPage");
  const favoritesPage = document.getElementById("favoritesPage");
  const activityPage = document.getElementById("activityPage");

  let wasOnOtherPage = false;

  if (courseDetailPage && courseDetailPage.style.display === "block") {
    if (typeof closeCourseDetail === "function") closeCourseDetail();
    wasOnOtherPage = true;
  }
  if (favoritesPage && favoritesPage.style.display === "block") {
    if (typeof showBrowseCourses === "function") showBrowseCourses();
    wasOnOtherPage = true;
  }
  if (activityPage && activityPage.style.display === "block") {
    if (typeof showBrowseCourses === "function") showBrowseCourses();
    wasOnOtherPage = true;
  }

  if (panel) {
    if (wasOnOtherPage) {
      panel.style.display = 'block';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.scrollTo(0, 0));
      });
    } else {
      const isCurrentlyOpen = panel.style.display !== 'none';

      if (isCurrentlyOpen) {
        panel.style.display = 'none';
        resetAllFilters();
      } else {
        panel.style.display = 'block';
      }
    }
  }
};

window.resetAllFilters = function() {
  renderDepartmentFilter("");
  renderDepartmentSubFilter("");
  const filterRows = ['deptCategoryFilterRow', 'deptFilterRow', 'gradeFilterRow', 'yearFilterRow', 'semesterFilterRow', 'ratingFilterRow'];

  filterRows.forEach(rowId => {
    const row = document.getElementById(rowId);
    if (!row) return;

    const buttons = row.querySelectorAll('.filter-tag-btn');
    buttons.forEach(b => b.classList.remove('active'));

    const allBtn = Array.from(buttons).find(b => b.dataset.value === "");
    if (allBtn) {
      allBtn.classList.add('active');
    }
  });

  const searchBox = document.getElementById("searchBox");
  if (searchBox) searchBox.value = "";

  if (typeof filterCourses === "function") filterCourses();
};


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

const _editDimBackup = {};

window.editReview = function(reviewId) {
  document.getElementById(`text-display-${reviewId}`).style.display = 'none';
  document.getElementById(`edit-form-${reviewId}`).style.display = 'block';

  const dimBox = document.getElementById(`dim-box-${reviewId}`);
  if (dimBox) {
    dimBox.classList.add('editing');
    _editDimBackup[reviewId] = {};
    dimBox.querySelectorAll('.dim-icon-wrap').forEach(el => {
      const dim = el.dataset.dim;
      if (!_editDimBackup[reviewId][dim]) {
        const row = document.getElementById(`dim-row-${reviewId}-${dim}`);
        if (row) _editDimBackup[reviewId][dim] = row.querySelectorAll('.active').length;
      }
      el.style.cursor = 'pointer';
    });
  }
};

window.cancelEdit = function(reviewId) {
  document.getElementById(`text-display-${reviewId}`).style.display = 'block';
  document.getElementById(`edit-form-${reviewId}`).style.display = 'none';

  const backup = _editDimBackup[reviewId] || {};
  const dimBox = document.getElementById(`dim-box-${reviewId}`);
  if (dimBox) {
    dimBox.classList.remove('editing');
    Object.entries(backup).forEach(([dim, v]) => {
      const row = document.getElementById(`dim-row-${reviewId}-${dim}`);
      if (row) {
        row.querySelectorAll('.dim-icon-wrap').forEach((el, i) => {
          el.classList.toggle('active', i < v);
          el.classList.toggle('inactive', i >= v);
          el.style.cursor = 'default';
          delete el.dataset.currentVal;
        });
        delete row.dataset.editVal;
      }
    });
  }
  delete _editDimBackup[reviewId];
};

// === dim icon 點擊（編輯模式）===
window.handleDimClick = function(event, reviewId, dim, val) {
  const dimBox = document.getElementById(`dim-box-${reviewId}`);
  if (!dimBox || !dimBox.classList.contains('editing')) return;

  const row = document.getElementById(`dim-row-${reviewId}-${dim}`);
  if (!row) return;

  row.querySelectorAll('.dim-icon-wrap').forEach((el, i) => {
    const wasActive = el.classList.contains('active');
    const willActive = i < val;
    el.classList.toggle('active', willActive);
    el.classList.toggle('inactive', !willActive);

    // pop 特效：新點亮的 icon
    if (willActive && !wasActive) {
      el.classList.remove('dim-pop');
      void el.offsetWidth;
      el.classList.add('dim-pop');
      el.addEventListener('animationend', () => el.classList.remove('dim-pop'), { once: true });
    }
  });
  row.dataset.editVal = val;
};

window.saveEdit = async function(reviewId) {
  const newText = document.getElementById(`edit-input-${reviewId}`).value.trim();

  if (!newText) {
    alert("評論內容不能為空喔！");
    return;
  }

  // 收集有改動的維度評分
  const dims = ["ratingQuality", "ratingSweetness", "ratingCoolness", "ratingSolidity"];
  const ratings = {};
  dims.forEach(dim => {
    const row = document.getElementById(`dim-row-${reviewId}-${dim}`);
    if (row && row.dataset.editVal) ratings[dim] = parseInt(row.dataset.editVal);
  });

  try {
    const result = await apiRequest(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify({ text: newText, ...ratings }),
    });

    if (result.review) replaceReviewInState(result.review);
    if (result.course) replaceCourseInState(result.course);

    loadReviews(currentCourseId);
    refreshDetailRatingSummary(currentCourseId);
  } catch (error) {
    alert(error.message);
  }
};

window.deleteReply = async function(reviewId, replyId) {
  if (!confirm("Are you sure you want to delete this reply? This action cannot be undone.")) return;

  try {
    const result = await apiRequest(`/api/replies/${replyId}`, {
      method: "DELETE",
    });

    if (result.review) {
      replaceReviewInState(result.review);
    } else {
      const review = findReviewById(reviewId);
      if (review && review.replies) {
        const index = review.replies.findIndex(r => String(r.id) === String(replyId));
        if (index !== -1) review.replies.splice(index, 1);
      }
    }
    loadReviews(currentCourseId);
  } catch (error) {
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

window.editReply = function(reviewId, replyId) {
  document.getElementById(`text-display-${replyId}`).style.display = 'none';
  document.getElementById(`edit-form-${replyId}`).style.display = 'block';
};

window.cancelEditReply = function(replyId) {
  document.getElementById(`text-display-${replyId}`).style.display = 'block';
  document.getElementById(`edit-form-${replyId}`).style.display = 'none';
};

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
    const reply = findReplyById(reviewId, replyId);
    if (reply) {
      reply.text = newText;
      loadReviews(currentCourseId);
    } else {
      alert(error.message);
    }
  }
};

function generateDynamicTrending() {
  const trendingContainer = document.querySelector(".trending-tags");
  if (!trendingContainer) return;

  const sortedCourses = [...allCourses].sort((a, b) => {
    const aPopularity = (a.saveCount || 0) + getCourseCommentTotal(a.id);
    const bPopularity = (b.saveCount || 0) + getCourseCommentTotal(b.id);
    return bPopularity - aPopularity;
  });

  const topKeywords = new Set();
  sortedCourses.forEach(course => {
    if (topKeywords.size < 5) {
      const keyword = course.name || course.title;
      if (keyword) topKeywords.add(keyword);
    }
  });

  trendingContainer.innerHTML = Array.from(topKeywords).map(keyword =>
    `<button type="button" class="trending-tag-btn">${escapeHtml(keyword)}</button>`
  ).join("");

  newBtns.forEach(btn => {
    btn.addEventListener("mousedown", function(e) {
      e.preventDefault();
      searchBox.value = this.textContent.trim();
      searchDropdown.style.display = "none";
      // 點擊熱門標籤時也要強制切換畫面
      showBrowseCourses(false);
      filterCourses();
    });
  });
}

document.addEventListener("DOMContentLoaded", function() {
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
  window.scrollTo(0, 0);
}

document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("backToTopBtn");
  if (!button) return;

  button.addEventListener("click", scrollToPageTop);
  updateBackToTopButton();
  window.addEventListener("scroll", updateBackToTopButton, { passive: true });
});



// --- Collect all available semesters from allCourses ---
function getAvailableSemesters() {
  const seen = new Set();
  allCourses.forEach(c => {
    if (c.year && c.semester) seen.add(`${c.year}-${c.semester}`);
  });
  return [...seen].sort((a, b) => {
    const [ay, as_] = a.split("-").map(Number);
    const [by, bs] = b.split("-").map(Number);
    return (by - ay) || (bs - as_);
  });
}

function updatePageTitle() {
    const searchBox = document.getElementById("searchBox");
    const heading = document.querySelector("#pageHeading h2");
    const kicker = document.querySelector("#pageHeading .page-kicker");
    const backBtn = document.getElementById("backToBrowseBtn");

    if (searchBox && searchBox.value.trim() !== "") {
        heading.textContent = "Search Results";
        kicker.textContent = "Searching for: " + searchBox.value;
        if (backBtn) backBtn.style.display = "block";
    } else {
        heading.textContent = "All Courses";
        kicker.textContent = "Let's explore !";
        if (backBtn) backBtn.style.display = "none";
    }
}

window.toggleReactionPalette = function(event) {
    event.stopPropagation();
    const container = event.currentTarget.closest(".reaction-container");

    document.querySelectorAll(".reaction-container.open").forEach(c => {
        if (c !== container) c.classList.remove("open");
    });

    if (container) {
        container.classList.toggle("open");
    }
};

document.addEventListener("click", function() {
    document.querySelectorAll(".reaction-container.open").forEach(c => {
        c.classList.remove("open");
    });
});



// buildPersonalActionCard is defined earlier (around line 2068) with full reply/reaction support.