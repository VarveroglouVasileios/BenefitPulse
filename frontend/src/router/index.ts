import { createRouter, createWebHistory } from "vue-router";
import { authGuard, adminGuard } from "./guards";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    // If there's a hash, scroll to it (but only after a delay to ensure DOM is ready)
    if (to.hash) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            el: to.hash,
            behavior: 'smooth',
          });
        }, 100);
      });
    }
    // For refresh (from.name === null), always scroll to top immediately
    if (from.name === null) {
      return { top: 0, left: 0 };
    }
    // If there's a saved position (e.g., browser back/forward), use it
    if (savedPosition) {
      return savedPosition;
    }
    // Otherwise, scroll to top immediately (no smooth for better UX)
    return { top: 0, left: 0 };
  },
  routes: [
    {
      path: "/",
      name: "Home",
      component: () => import("../views/public/Home.vue"),
    },
    {
      path: "/trending",
      name: "Trending",
      component: () => import("../views/public/Trending.vue"),
    },
    {
      path: "/opportunities",
      name: "AllOpportunities",
      component: () => import("../views/public/AllOpportunities.vue"),
    },
    {
      path: "/opportunities/:id",
      name: "OpportunityDetail",
      component: () => import("../views/public/OpportunityDetail.vue"),
    },
    {
      path: "/login",
      name: "Login",
      component: () => import("../views/auth/Login.vue"),
    },
    {
      path: "/register",
      name: "Register",
      component: () => import("../views/auth/Register.vue"),
    },
    {
      path: "/terms",
      name: "Terms",
      component: () => import("../views/public/Terms.vue"),
    },
    {
      path: "/privacy",
      name: "Privacy",
      component: () => import("../views/public/Privacy.vue"),
    },
    {
      path: "/disclaimer",
      name: "Disclaimer",
      component: () => import("../views/public/Disclaimer.vue"),
    },
    {
      path: "/cookies",
      name: "Cookies",
      component: () => import("../views/public/Cookies.vue"),
    },
    {
      path: "/profile/wizard",
      name: "ProfileWizard",
      component: () => import("../views/user/ProfileWizard.vue"),
      beforeEnter: authGuard,
    },
    {
      path: "/for-you",
      name: "ForYou",
      component: () => import("../views/user/ForYou.vue"),
      beforeEnter: authGuard,
    },
    {
      path: "/today",
      name: "Today",
      component: () => import("../views/user/Today.vue"),
      beforeEnter: authGuard,
    },
    {
      path: "/new",
      name: "NewSinceLastVisit",
      component: () => import("../views/user/NewSinceLastVisit.vue"),
      beforeEnter: authGuard,
    },
    {
      path: "/expiring",
      name: "ExpiringSoon",
      component: () => import("../views/user/ExpiringSoon.vue"),
      beforeEnter: authGuard,
    },
    {
      path: "/bookmarks",
      name: "Bookmarks",
      component: () => import("../views/user/Bookmarks.vue"),
      beforeEnter: authGuard,
    },
    {
      path: "/admin",
      name: "AdminDashboard",
      component: () => import("../views/admin/AdminDashboard.vue"),
      beforeEnter: [authGuard, adminGuard],
    },
    {
      path: "/admin/opportunities",
      name: "AdminOpportunities",
      component: () => import("../views/admin/AdminOpportunities.vue"),
      beforeEnter: [authGuard, adminGuard],
    },
    {
      path: "/admin/opportunities/:id/edit",
      name: "AdminOpportunityEditor",
      component: () => import("../views/admin/AdminOpportunityEditor.vue"),
      beforeEnter: [authGuard, adminGuard],
    },
    {
      path: "/admin/drafts",
      name: "AdminDraftQueue",
      component: () => import("../views/admin/AdminDraftQueue.vue"),
      beforeEnter: [authGuard, adminGuard],
    },
    {
      path: "/admin/audit",
      name: "AdminAuditLog",
      component: () => import("../views/admin/AdminAuditLog.vue"),
      beforeEnter: [authGuard, adminGuard],
    },
    {
      path: "/admin/contact",
      name: "AdminContact",
      component: () => import("../views/admin/AdminContact.vue"),
      beforeEnter: [authGuard, adminGuard],
    },
    {
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("../views/public/NotFound.vue"),
    },
  ],
});

export default router;
