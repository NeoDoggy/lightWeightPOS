const dictionaries = {
    en: {
        app_title: "LW POS",
        nav_selling: "Selling",
        nav_dashboard: "Dashboard",
        nav_settings: "Settings",
        nav_collapse: "Collapse",
        view_selling_title: "Active Selling Workspace",
        view_dashboard_title: "Analytics & Logs",
        view_settings_title: "System Configuration",
        // Onboarding Strings
        tour_skip: "Skip Tour",
        tour_next: "Next",
        tour_finish: "Get Started",
        tour_step1_title: "Welcome to LW POS",
        tour_step1_desc: "Let's take a quick look around. This sidebar is your main navigation hub.",
        tour_step2_title: "Catalog Grid",
        tour_step2_desc: "Tap these items to instantly add them to the current order. Perfect for fast-paced events.",
        tour_step3_title: "Active Cart",
        tour_step3_desc: "Manage quantities and checkout here. The system will automatically calculate totals.",
        tour_step4_title: "Settings & Sync",
        tour_step4_desc: "Access the dashboard for analytics, or settings to export your JSON data and add new catalog items.",
        // Welcome Modal Strings
        tour_welcome_title: "Welcome to LW POS",
        tour_welcome_desc: "Would you like a quick interactive tour to learn how to manage events, add items, and checkout?",
        tour_welcome_skip: "No, skip it",
        tour_welcome_start: "Yes, start tour"
    },
    'zh-TW': {
        app_title: "輕量化 POS",
        nav_selling: "收銀",
        nav_dashboard: "儀表板",
        nav_settings: "設定",
        nav_collapse: "收起",
        view_selling_title: "收銀作業區",
        view_dashboard_title: "營運分析與日誌",
        view_settings_title: "系統設定",
        // Onboarding Strings
        tour_skip: "跳過導覽",
        tour_next: "下一步",
        tour_finish: "開始使用",
        tour_step1_title: "歡迎使用",
        tour_step1_desc: "讓我們快速了解一下。左側是您的主要導航列。",
        tour_step2_title: "商品區",
        tour_step2_desc: "點擊這些商品即可將其加入當前訂單，非常適合高吞吐量的展會（如 C108）收銀。",
        tour_step3_title: "購物車與結帳",
        tour_step3_desc: "在此處管理數量並結帳，系統將自動計算總金額。",
        tour_step4_title: "設定與同步",
        tour_step4_desc: "您可以在儀表板查看分析，或在設定中新增商品及匯出 JSON 資料。",
        // Welcome Modal Strings
        tour_welcome_title: "歡迎使用輕量化 POS",
        tour_welcome_desc: "您想要進行快速的互動式導覽，學習如何管理活動、新增商品以及結帳嗎？",
        tour_welcome_skip: "不，跳過導覽",
        tour_welcome_start: "好，開始導覽"
    }
};

let currentLocale = navigator.language.startsWith('zh') ? 'zh-TW' : 'en';

export const i18n = {
    setLocale: (locale) => {
        if (dictionaries[locale]) currentLocale = locale;
    },
    t: (key) => dictionaries[currentLocale][key] || key
};