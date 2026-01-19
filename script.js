// Set global API keys and URLs for external services
window.CALLAI_API_KEY = "";
window.CALLAI_CHAT_URL = "https://vibes-diy-api.com/";
window.CALLAI_IMG_URL = "https://vibes-diy-api.com/";

// Import ReactDOMClient for rendering React components
import ReactDOMClient from "react-dom/client";

// Import React and hooks for state management and effects
import React, { useState, useEffect, useRef } from "react";
import { useFireproof } from "use-fireproof";

export default function App() {
  // Initialize Fireproof database and live queries for apps and versions
  const { useLiveQuery, database } = useFireproof("puter-apps-v6");
  const { docs: apps } = useLiveQuery("type", { key: "app", descending: true });
  const { docs: versions } = useLiveQuery("type", { key: "version", descending: true });

  // State variables for user input, app data, UI flags, etc.
  const [prompt, setPrompt] = useState("");
  const [appName, setAppName] = useState("");
  const [appTitle, setAppTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [editCode, setEditCode] = useState("");
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("gpt-4o-mini");
  const [provider, setProvider] = useState("All");
  const [puter, setPuter] = useState(null);
  const [user, setUser] = useState(null);
  const [log, setLog] = useState([]);
  const [showCode, setShowCode] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  // New feature states for templates, UI tabs, modes, and modals
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [activeTab, setActiveTab] = useState("build");
  const [darkMode, setDarkMode] = useState(() => {
    // Load dark mode preference from localStorage or default to false
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [activeCategory, setActiveCategory] = useState("All");
  const fileInputRef = useRef(null);

  // App templates with default prompts and categories
  const templates = [
    { id: "todo", name: "Todo App", icon: "✅", prompt: "A beautiful todo app with categories, priorities, due dates, dark/light mode toggle, and local storage persistence", category: "Productivity" },
    { id: "calculator", name: "Calculator", icon: "🔢", prompt: "A scientific calculator with history, memory functions, keyboard support, and a sleek modern UI", category: "Utilities" },
    { id: "notes", name: "Notes App", icon: "📝", prompt: "A notes app with markdown support, folders, search, tags, and auto-save functionality", category: "Productivity" },
    { id: "timer", name: "Pomodoro Timer", icon: "⏱️", prompt: "A pomodoro timer with customizable work/break intervals, statistics, sounds, and notifications", category: "Productivity" },
    { id: "weather", name: "Weather Dashboard", icon: "🌤️", prompt: "A weather dashboard that shows current conditions, 5-day forecast, with beautiful animations and location search", category: "Utilities" },
    { id: "kanban", name: "Kanban Board", icon: "📋", prompt: "A kanban board with drag-and-drop cards, multiple columns, labels, and local storage", category: "Productivity" },
    { id: "password", name: "Password Generator", icon: "🔐", prompt: "A password generator with strength meter, customizable options, copy to clipboard, and password history", category: "Utilities" },
    { id: "quiz", name: "Quiz Game", icon: "🎯", prompt: "An interactive quiz game with multiple categories, scoring, timer, and leaderboard", category: "Entertainment" },
    { id: "expense", name: "Expense Tracker", icon: "💰", prompt: "An expense tracker with categories, charts, monthly budgets, and export functionality", category: "Productivity" },
    { id: "drawing", name: "Drawing App", icon: "🎨", prompt: "A drawing canvas with brush sizes, colors, shapes, layers, undo/redo, and save as image", category: "Entertainment" },
    { id: "music", name: "Music Player", icon: "🎵", prompt: "A music player UI with playlist, progress bar, volume control, shuffle, and visualizer", category: "Entertainment" },
    { id: "chat", name: "Chat Interface", icon: "💬", prompt: "A chat interface with message bubbles, typing indicators, timestamps, and emoji picker", category: "Communication" },
  ];

  // Add a message to log, keeping recent 16 entries
  const addLog = (msg) => setLog(prev => [...prev.slice(-16), `${new Date().toLocaleTimeString()}: ${msg}`]);

  // Display code snippet either in edit or selected app
  const displayCode = editCode || selectedApp?.code || "";

  // Add a new tag if not empty and not already present
  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  // Remove a tag from the tags list
  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Toggle tag filter selection for filtering apps
  const toggleTagFilter = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Get all unique tags from all apps
  const getAllTags = () => {
    const allTags = apps.flatMap(app => app.tags || []);
    return [...new Set(allTags)].sort();
  };

  // Get unique categories from templates for filtering
  const getCategories = () => {
    const categories = [...new Set(templates.map(t => t.category))];
    return ["All", ...categories.sort()];
  };

  // Filter templates by selected category
  const filteredTemplates = activeCategory === "All"
    ? templates
    : templates.filter(t => t.category === activeCategory);

  // Filter and sort apps based on various states like favorites, search, tags, and sorting order
  const filteredApps = apps
    .filter(app => {
      if (filterFavorites && !app.favorite) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          app.appName?.toLowerCase().includes(q) ||
          app.appTitle?.toLowerCase().includes(q) ||
          app.prompt?.toLowerCase().includes(q)
        );
      }
      if (selectedTags.length > 0) {
        const appTags = app.tags || [];
        return selectedTags.some(tag => appTags.includes(tag));
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortBy === "name") return (a.appTitle || a.appName || "").localeCompare(b.appTitle || b.appName || "");
      if (sortBy === "views") return (b.views || 0) - (a.views || 0);
      return 0;
    });

  // Prepare analytics data from apps and versions
  const analytics = {
    totalApps: apps.length,
    totalVersions: versions.filter(v => selectedApp && v.appId === selectedApp._id).length,
    favorites: apps.filter(a => a.favorite).length,
    totalViews: apps.reduce((sum, a) => sum + (a.views || 0), 0),
    modelsUsed: [...new Set(apps.map(a => a.model))].length,
    avgCodeSize: apps.length ? Math.round(apps.reduce((sum, a) => sum + (a.code?.length || 0), 0) / apps.length) : 0
  };

  // On component mount: load Puter SDK, authenticate user, and fetch models
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.onload = async () => {
      setPuter(window.puter);
      addLog("SDK ready");
      if (window.puter.auth.isSignedIn()) {
        const u = await window.puter.auth.getUser();
        setUser(u);
        addLog(`Welcome ${u.username}`);
      }
    };
    document.body.appendChild(script);

    // Fetch available models from Puter AI API and parse providers
    fetch("https://api.puter.com/puterai/chat/models/")
      .then(r => r.json())
      .then(data => {
        const list = (Array.isArray(data) ? data : data.models || []).map(m => {
          const id = typeof m === "string" ? m : m.id;
          let prov = "Other";
          if (/gpt|o1|o3|chatgpt/i.test(id)) prov = "OpenAI";
          else if (/claude/i.test(id)) prov = "Anthropic";
          else if (/gemini|gemma/i.test(id)) prov = "Google";
          else if (/llama/i.test(id)) prov = "Meta";
          else if (/mistral|mixtral/i.test(id)) prov = "Mistral";
          else if (/deepseek/i.test(id)) prov = "DeepSeek";
          else if (/grok/i.test(id)) prov = "xAI";
          else if (/qwen/i.test(id)) prov = "Alibaba";
          return { id, provider: prov };
        });
        setModels(list);
      })
      .catch(() => {});
  }, []);

  // Save dark mode preference in localStorage when it changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Compute filtered list of models by selected provider
  const providers = ["All", ...new Set(models.map(m => m.provider))].sort();
  const filtered = provider === "All" ? models : models.filter(m => m.provider === provider);

  // User sign in function using Puter auth
  async function signIn() {
    if (!puter) return;
    await puter.auth.signIn();
    const u = await puter.auth.getUser();
    setUser(u);
    addLog(`Welcome ${u.username}`);
  }

  // Basic HTML validation to ensure required tags and declaration exist
  function validateHTML(code) {
    const errors = [];
    if (!code.toLowerCase().includes("<!doctype html>")) {
      errors.push("Missing DOCTYPE declaration. HTML must start with <!DOCTYPE html>");
    }
    if (!/<html[^>]*>/i.test(code)) {
      errors.push("Missing <html> opening tag");
    }
    if (!/<\/html>/i.test(code)) {
      errors.push("Missing </html> closing tag");
    }
    if (!/<head[^>]*>/i.test(code)) {
      errors.push("Missing <head> opening tag");
    }
    if (!/<\/head>/i.test(code)) {
      errors.push("Missing </head> closing tag");
    }
    if (!/<body[^>]*>/i.test(code)) {
      errors.push("Missing <body> opening tag");
    }
    if (!/<\/body>/i.test(code)) {
      errors.push("Missing </body> closing tag");
    }
    if (errors.length > 0) {
      throw new Error("HTML Validation Failed:\n" + errors.join("\n"));
    }
  }

  // Build, deploy, and register a new app using prompt and user input
  async function buildAndDeploy(customPrompt) {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim() || !puter || !user) return;
    setGenerating(true);
    setSelectedApp(null);
    setEditCode("");
    setLog([]);
    setShowTemplates(false);

    try {
      addLog(`Model: ${model}`);
      addLog("Generating code...");

      // Define system prompt rules for AI code generation
      const systemPrompt = `You are an expert web developer. Create a COMPLETE single HTML file app.
RULES:
- Start with <!DOCTYPE html>
- ALL CSS in <style> tag, ALL JS in <script> tag
- Modern CSS: variables, flexbox/grid, animations, gradients
- Modern JS: ES6+, localStorage, event handling
- Responsive and polished UI
- NO external dependencies
- Return ONLY HTML code`;

      // Call Puter AI chat for code generation
      const res = await puter.ai.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Build: ${finalPrompt}` }
      ], { model });

      // Clean up the generated code string, remove markdown formatting
      let code = res?.message?.content || res?.text || res?.content || String(res);
      code = code.replace(/```html?\n?/gi, "").replace(/```\n?/g, "").trim();
      const start = code.search(/<!doctype\s+html>/i);
      if (start > 0) code = code.slice(start);
      validateHTML(code);

      addLog(`Generated ${code.length} bytes`);

      // Create a directory and write generated code
      addLog("Creating directory...");
      const dirName = `app_${Date.now()}`;
      await puter.fs.mkdir(dirName);
      await puter.fs.write(`${dirName}/index.html`, code);
      addLog(`Wrote to ${dirName}/index.html`);

      // Create hosted site with subdomain
      addLog("Creating hosted site...");
      const subdomain = appName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || puter.randName();
      const site = await puter.hosting.create(subdomain, dirName);
      const hostedUrl = `https://${site.subdomain}.puter.site`;
      addLog(`Hosted at: ${hostedUrl}`);

      // Register the app in Puter apps with fallback for name conflicts
      addLog("Registering Puter app...");
      const finalAppName = appName.trim() || puter.randName();
      const finalAppTitle = appTitle.trim() || finalPrompt.slice(0, 50);

      let puterApp;
      try {
        puterApp = await puter.apps.create({
          name: finalAppName,
          indexURL: hostedUrl,
          title: finalAppTitle,
          description: finalPrompt,
          maximizeOnStart: true,
          dedupeName: true
        });
        addLog(`App registered: ${puterApp.name}`);
      } catch (appErr) {
        addLog(`Name taken, using random...`);
        const randomName = puter.randName();
        puterApp = await puter.apps.create({
          name: randomName,
          indexURL: hostedUrl,
          title: finalAppTitle,
          description: finalPrompt,
          maximizeOnStart: true
        });
        addLog(`App registered: ${puterApp.name}`);
      }

      // Save app details in database
      addLog("Saving to database...");
      const doc = await database.put({
        type: "app",
        prompt: finalPrompt,
        code,
        subdomain: site.subdomain,
        hostedUrl,
        appName: puterApp.name,
        appUid: puterApp.uid,
        appTitle: finalAppTitle,
        model,
        dir: dirName,
        createdAt: Date.now(),
        views: 0,
        favorite: false,
        tags: tags,
        version: 1
      });

      // Save initial version entry for version history
      await database.put({
        type: "version",
        appId: doc.id,
        code,
        version: 1,
        createdAt: Date.now(),
        note: "Initial version"
      });

      // Reload app from database and reset UI states
      const saved = await database.get(doc.id);
      setSelectedApp(saved);
      setAppName("");
      setAppTitle("");
      setPrompt("");
      setSelectedTemplate(null);
      setTags([]);
      addLog("✅ Complete!");
      window.open(hostedUrl, "_blank");

    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
    }
    setGenerating(false);
  }

  // Update an existing app with new edited code and redeploy
  async function updateAndRedeploy() {
    if (!selectedApp || !editCode || !puter) return;
    setGenerating(true);
    try {
      addLog("Updating...");

      // Cleanup old directory in Puter filesystem
      if (selectedApp.dir) {
        addLog("Cleaning up old directory...");
        try {
          await puter.fs.rmdir(selectedApp.dir);
          addLog("Old directory removed");
        } catch (e) {
          addLog("Old directory already removed or not found");
        }
      }

      // Create new directory and write updated code
      const dirName = `app_${Date.now()}`;
      await puter.fs.mkdir(dirName);
      await puter.fs.write(`${dirName}/index.html`, editCode);

      // Delete old hosting and create new hosted site
      try { await puter.hosting.delete(selectedApp.subdomain); } catch (e) {}
      const site = await puter.hosting.create(selectedApp.subdomain, dirName);
      const hostedUrl = `https://${site.subdomain}.puter.site`;

      // Update Puter app with new hosted URL
      if (selectedApp.appName) {
        try {
          await puter.apps.update(selectedApp.appName, { indexURL: hostedUrl });
          addLog(`Updated app: ${selectedApp.appName}`);
        } catch (e) {}
      }

      // Increment version and save to version history in database
      const newVersion = (selectedApp.version || 1) + 1;
      await database.put({
        type: "version",
        appId: selectedApp._id,
        code: editCode,
        version: newVersion,
        createdAt: Date.now(),
        note: `Version ${newVersion}`
      });

      // Update app document with new version and data
      await database.put({
        ...selectedApp,
        code: editCode,
        dir: dirName,
        hostedUrl,
        updatedAt: Date.now(),
        version: newVersion,
        tags: tags
      });

      const updated = await database.get(selectedApp._id);
      setSelectedApp(updated);
      setEditCode("");
      addLog(`✅ Updated to v${newVersion}`);
      window.open(hostedUrl, "_blank");
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
    }
    setGenerating(false);
  }

  // Delete an app from Puter platform and database with cleanup
  async function deleteApp(app, e) {
    e?.stopPropagation();
    try {
      addLog(`Deleting ${app.appName || app.subdomain}...`);
      // Remove directory from filesystem
      if (app.dir) {
        try {
          await puter.fs.rmdir(app.dir);
          addLog("Directory removed");
        } catch (e) {
          addLog("Directory already removed or not found");
        }
      }
      if (app.appName) {
        try { await puter.apps.delete(app.appName); } catch (e) {}
      }
      if (app.subdomain) {
        try { await puter.hosting.delete(app.subdomain); } catch (e) {}
      }
      // Delete all versions from database
      const appVersions = versions.filter(v => v.appId === app._id);
      for (const v of appVersions) {
        await database.del(v._id);
      }
      // Delete app document itself
      await database.del(app._id);
      if (selectedApp?._id === app._id) {
        setSelectedApp(null);
        setEditCode("");
      }
      addLog("✅ Deleted");
    } catch (e) {
      addLog(`❌ Error: ${e.message}`);
    }
  }

  // Bulk delete selected apps
  async function bulkDelete() {
    if (selectedApps.size === 0) return;
    for (const appId of selectedApps) {
      const app = apps.find(a => a._id === appId);
      if (app) await deleteApp(app);
    }
    setSelectedApps(new Set());
    setBulkMode(false);
  }

  // Toggle favorite flag for an app
  async function toggleFavorite(app, e) {
    e?.stopPropagation();
    await database.put({ ...app, favorite: !app.favorite });
    if (selectedApp?._id === app._id) {
      setSelectedApp({ ...app, favorite: !app.favorite });
    }
  }

  // Increment app views count in database
  async function incrementViews(app) {
    await database.put({ ...app, views: (app.views || 0) + 1 });
  }

  // Launch an app via puter.apps.launch or open hosted URL in new tab
  async function launchApp(app, e) {
    e?.stopPropagation();
    await incrementViews(app);
    if (app.appName && puter) {
      try {
        await puter.apps.launch(app.appName);
        addLog(`Launched: ${app.appName}`);
      } catch (err) {
        window.open(app.hostedUrl, "_blank");
      }
    } else {
      window.open(app.hostedUrl, "_blank");
    }
  }

  // Restore a previous version of selected app's code
  async function restoreVersion(version) {
    if (!selectedApp) return;
    setEditCode(version.code);
    addLog(`Restored v${version.version}`);
    setShowVersions(false);
  }

  // Export all apps to JSON file and download
  function exportApps() {
    const data = JSON.stringify(apps, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `puter-apps-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("✅ Exported apps");
    setShowExportModal(false);
  }

  // Export one app to JSON file and download
  function exportSingleApp(app) {
    const data = JSON.stringify(app, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${app.appName || "app"}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`✅ Exported ${app.appName}`);
  }

  // Import apps from uploaded JSON file and save to database
  async function importApps(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const imported = JSON.parse(text);
      const appsToImport = Array.isArray(imported) ? imported : [imported];
      for (const app of appsToImport) {
        delete app._id;
        app.imported = true;
        app.createdAt = Date.now();
        await database.put(app);
      }
      addLog(`✅ Imported ${appsToImport.length} app(s)`);
    } catch (err) {
      addLog(`❌ Import failed: ${err.message}`);
    }
    e.target.value = "";
    setShowExportModal(false);
  }

  // Generate shareable link encoding app data in URL
  function generateShareLink(app) {
    const encoded = btoa(JSON.stringify({ 
      prompt: app.prompt, 
      code: app.code, 
      title: app.appTitle 
    }));
    const link = `${window.location.origin}?share=${encoded}`;
    setShareLink(link);
    setShowShareModal(true);
  }

  // Copy share link to clipboard
  function copyShareLink() {
    navigator.clipboard.writeText(shareLink);
    addLog("✅ Link copied!");
  }

  // Select a template to pre-fill prompt and app title
  function selectTemplate(template) {
    setSelectedTemplate(template);
    setPrompt(template.prompt);
    setAppTitle(template.name);
    setShowTemplates(false);
    setActiveCategory("All"); // Reset to All when a template is selected
  }

  // Filter versions for selected app and sort newest first
  const appVersions = selectedApp ? versions.filter(v => v.appId === selectedApp._id).sort((a, b) => b.version - a.version) : [];

  // Neomorphic styles for light and dark themes with button variants
  const lightNeu = "bg-[#e8e8e8] shadow-[8px_8px_16px_#c5c5c5,-8px_-8px_16px_#ffffff]";
  const lightNeuInset = "bg-[#e8e8e8] shadow-[inset_4px_4px_8px_#c5c5c5,inset_-4px_-4px_8px_#ffffff]";
  const lightNeuBtn = "bg-[#e8e8e8] shadow-[5px_5px_10px_#c5c5c5,-5px_-5px_10px_#ffffff] hover:shadow-[2px_2px_5px_#c5c5c5,-2px_-2px_5px_#ffffff] active:shadow-[inset_4px_4px_8px_#c5c5c5,inset_-4px_-4px_8px_#ffffff] transition-all duration-150";
  const lightNeuBtnRed = "bg-[#dc2626] text-white shadow-[5px_5px_10px_#c5c5c5,-5px_-5px_10px_#ffffff] hover:shadow-[2px_2px_5px_#c5c5c5,-2px_-2px_5px_#ffffff] active:shadow-[inset_4px_4px_8px_#b91c1c,inset_-4px_-4px_8px_#ef4444] transition-all duration-150";
  const lightNeuBtnBlack = "bg-[#1a1a1a] text-white shadow-[5px_5px_10px_#c5c5c5,-5px_-5px_10px_#ffffff] hover:shadow-[2px_2px_5px_#c5c5c5,-2px_-2px_5px_#ffffff] active:shadow-[inset_4px_4px_8px_#000,inset_-4px_-4px_8px_#333] transition-all duration-150";

  const darkNeu = "bg-[#2a2a2a] shadow-[8px_8px_16px_#1a1a1a,-8px_-8px_16px_#3a3a3a]";
  const darkNeuInset = "bg-[#2a2a2a] shadow-[inset_4px_4px_8px_#1a1a1a,inset_-4px_-4px_8px_#3a3a3a]";
  const darkNeuBtn = "bg-[#2a2a2a] shadow-[5px_5px_10px_#1a1a1a,-5px_-5px_10px_#3a3a3a] hover:shadow-[2px_2px_5px_#1a1a1a,-2px_-2px_5px_#3a3a3a] active:shadow-[inset_4px_4px_8px_#1a1a1a,inset_-4px_-4px_8px_#3a3a3a] transition-all duration-150";
  const darkNeuBtnRed = "bg-[#dc2626] text-white shadow-[5px_5px_10px_#1a1a1a,-5px_-5px_10px_#3a3a3a] hover:shadow-[2px_2px_5px_#1a1a1a,-2px_-2px_5px_#3a3a3a] active:shadow-[inset_4px_4px_8px_#b91c1c,inset_-4px_-4px_8px_#ef4444] transition-all duration-150";
  const darkNeuBtnBlack = "bg-[#1a1a1a] text-white shadow-[5px_5px_10px_#1a1a1a,-5px_-5px_10px_#3a3a3a] hover:shadow-[2px_2px_5px_#1a1a1a,-2px_-2px_5px_#3a3a3a] active:shadow-[inset_4px_4px_8px_#000,inset_-4px_-4px_8px_#333] transition-all duration-150";

  // Use theme values for current dark mode state
  const neu = darkMode ? darkNeu : lightNeu;
  const neuInset = darkMode ? darkNeuInset : lightNeuInset;
  const neuBtn = darkMode ? darkNeuBtn : lightNeuBtn;
  const neuBtnRed = darkMode ? darkNeuBtnRed : lightNeuBtnRed;
  const neuBtnBlack = darkMode ? darkNeuBtnBlack : lightNeuBtnBlack;

  const bgMain = darkMode ? "bg-[#1a1a1a]" : "bg-[#e8e8e8]";
  const textPrimary = darkMode ? "text-[#e8e8e8]" : "text-[#1a1a1a]";
  const textSecondary = darkMode ? "text-[#cccccc]" : "text-[#666]";
  const textMuted = darkMode ? "text-[#888]" : "text-[#888]";

  // Render the React component with UI including header, build tab, apps list, modals, and preview
  return (
    <div className={`min-h-screen ${bgMain} p-4 md:p-6 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
       {/* Header */}
        <div className={`${neu} rounded-[24px] p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
               <h1 className={`text-2xl md:text-3xl font-black ${textPrimary} flex items-center gap-2`}>
                 <span className="text-[#dc2626]">⚡</span> PUTER APP FACTORY
               </h1>
               <p className={`${textSecondary} text-sm mt-1`}>{models.length} models • {apps.length} apps • {analytics.totalViews} views</p>
             </div>
            <div className="flex items-center gap-3">
               <button onClick={() => setDarkMode(!darkMode)}
                 className={`${neuBtn} rounded-full px-4 py-2 font-bold ${textPrimary} text-sm`}>
                 {darkMode ? "☀️" : "🌙"}
               </button>
               {user && (
                 <>
                   <button onClick={() => setShowAnalytics(!showAnalytics)}
                     className={`${neuBtn} rounded-full px-4 py-2 font-bold ${textPrimary} text-sm`}>
                     📊
                   </button>
                  <button onClick={() => setShowExportModal(true)}
                    className={`${neuBtn} rounded-full px-4 py-2 font-bold ${textPrimary} text-sm`}>
                    📦
                  </button>
                </>
              )}
              {user ? (
                <div className="flex items-center gap-3">
                  <div className={`${neuInset} rounded-full px-4 py-2`}>
                    <span className={`font-bold ${textPrimary} text-sm`}>👤 {user.username}</span>
                  </div>
                  <button onClick={() => { puter.auth.signOut(); setUser(null); }}
                    className={`${neuBtn} rounded-full px-4 py-2 font-bold ${textPrimary} text-sm`}>
                    Logout
                  </button>
                </div>
              ) : (
                <button onClick={signIn} disabled={!puter}
                  className={`${neuBtnRed} rounded-full px-6 py-3 font-black disabled:opacity-50`}>
                  Sign In Free
                </button>
              )}
            </div>
          </div>

          {/* Analytics Panel */}
          {showAnalytics && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-4">
              {[
                { label: "Total Apps", value: analytics.totalApps, icon: "📱" },
                { label: "Favorites", value: analytics.favorites, icon: "⭐" },
                { label: "Total Views", value: analytics.totalViews, icon: "👁️" },
                { label: "Models Used", value: analytics.modelsUsed, icon: "🤖" },
                { label: "Avg Code Size", value: `${(analytics.avgCodeSize / 1024).toFixed(1)}KB`, icon: "📄" },
                { label: "Versions", value: versions.length, icon: "📚" },
              ].map((stat, i) => (
                <div key={i} className={`${neuInset} rounded-2xl p-4 text-center`}>
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className={`font-black ${textPrimary} text-xl`}>{stat.value}</div>
                  <div className={`${textSecondary} text-xs`}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export/Import Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExportModal(false)}>
            <div className={`${neu} rounded-[24px] p-6 max-w-md w-full`} onClick={e => e.stopPropagation()}>
              <h3 className={`font-black ${textPrimary} text-xl mb-4`}>📦 Export / Import</h3>
              <div className="space-y-3">
                <button onClick={exportApps} className={`w-full ${neuBtn} rounded-xl py-3 font-bold ${textPrimary}`}>
                  📤 Export All Apps (JSON)
                </button>
                <button onClick={() => fileInputRef.current?.click()} className={`w-full ${neuBtn} rounded-xl py-3 font-bold ${textPrimary}`}>
                  📥 Import Apps (JSON)
                </button>
                <input ref={fileInputRef} type="file" accept=".json" onChange={importApps} className="hidden" />
              </div>
              <button onClick={() => setShowExportModal(false)} className={`w-full ${neuBtnBlack} rounded-xl py-3 font-bold mt-4`}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
            <div className={`${neu} rounded-[24px] p-6 max-w-lg w-full`} onClick={e => e.stopPropagation()}>
              <h3 className={`font-black ${textPrimary} text-xl mb-4`}>🔗 Share App</h3>
              <div className={`${neuInset} rounded-xl p-3 mb-4`}>
                <input value={shareLink} readOnly className={`w-full bg-transparent text-xs font-mono ${textPrimary} outline-none`} />
              </div>
              <div className="flex gap-3">
                <button onClick={copyShareLink} className={`flex-1 ${neuBtnRed} rounded-xl py-3 font-bold`}>
                  📋 Copy Link
                </button>
                <button onClick={() => setShowShareModal(false)} className={`flex-1 ${neuBtnBlack} rounded-xl py-3 font-bold`}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Version History Modal */}
        {showVersions && selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowVersions(false)}>
            <div className={`${neu} rounded-[24px] p-6 max-w-md w-full max-h-[80vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
              <h3 className={`font-black ${textPrimary} text-xl mb-4`}>📚 Version History</h3>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {appVersions.length === 0 ? (
                  <p className={`${textSecondary} text-center py-4`}>No versions saved yet</p>
                ) : (
                  appVersions.map(v => (
                    <div key={v._id} className={`${neuInset} rounded-xl p-3 flex justify-between items-center`}>
                      <div>
                        <div className={`font-bold ${textPrimary}`}>Version {v.version}</div>
                        <div className={`${textSecondary} text-xs`}>{new Date(v.createdAt).toLocaleString()}</div>
                      </div>
                      <button onClick={() => restoreVersion(v)} className={`${neuBtn} rounded-full px-3 py-1 text-sm font-bold ${textPrimary}`}>
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setShowVersions(false)} className={`w-full ${neuBtnBlack} rounded-xl py-3 font-bold mt-4`}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Templates Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTemplates(false)}>
            <div className={`${neu} rounded-[24px] p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
              <h3 className={`font-black ${textPrimary} text-xl mb-4`}>🎨 App Templates</h3>
              
              {/* Category Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {getCategories().map(category => (
                  <button key={category} onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                      activeCategory === category
                        ? `${neuInset} text-[#dc2626]`
                        : `${neuBtn} ${textPrimary}`}`}>
                    {category === "All" ? "🌐 All" : category}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto">
                {filteredTemplates.map(t => (
                  <button key={t.id} onClick={() => selectTemplate(t)}
                    className={`${neuBtn} rounded-xl p-4 text-left transition-all ${selectedTemplate?.id === t.id ? "ring-2 ring-[#dc2626]" : ""}`}>
                    <div className="text-3xl mb-2">{t.icon}</div>
                    <div className={`font-bold ${textPrimary} text-sm`}>{t.name}</div>
                    <div className={`text-xs ${textSecondary} mt-1`}>{t.category}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowTemplates(false)} className={`w-full ${neuBtnBlack} rounded-xl py-3 font-bold mt-4`}>
                Close
              </button>
            </div>
          </div>
        )}

        {!user ? (
          <div className={`${neu} rounded-[32px] p-12 text-center`}>
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#dc2626] flex items-center justify-center shadow-[inset_4px_4px_8px_#b91c1c,inset_-4px_-4px_8px_#ef4444]">
              <span className="text-5xl">🚀</span>
            </div>
            <h2 className={`text-3xl font-black ${textPrimary} mb-3`}>Build & Deploy Puter Apps</h2>
            <p className={`${textSecondary} mb-8 max-w-md mx-auto`}>
              Describe your app → AI builds it → Deploy as a real Puter app with live URL
            </p>
            <button onClick={signIn} disabled={!puter}
              className={`${neuBtnRed} rounded-full px-10 py-4 font-black text-lg disabled:opacity-50`}>
              Get Started Free
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left Panel */}
            <div className="space-y-6">
              {/* Tabs */}
              <div className={`${neu} rounded-[24px] p-2 flex gap-2`}>
                {[
                  { id: "build", label: "Build", icon: "🔨" },
                  { id: "apps", label: "Apps", icon: "📱" },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                      activeTab === tab.id ? `${neuInset} text-[#dc2626]` : `${neuBtn} ${textPrimary}`}`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "build" && (
                <div className={`${neu} rounded-[24px] p-5`}>
                  <button onClick={() => setShowTemplates(true)}
                    className={`w-full ${neuBtn} rounded-xl py-3 font-bold ${textPrimary} mb-4 flex items-center justify-center gap-2`}>
                    🎨 Choose Template
                  </button>

                  {selectedTemplate && (
                    <div className={`${neuInset} rounded-xl p-3 mb-4 flex items-center gap-3`}>
                      <span className="text-2xl">{selectedTemplate.icon}</span>
                      <div>
                        <div className={`font-bold ${textPrimary} text-sm`}>{selectedTemplate.name}</div>
                        <button onClick={() => { setSelectedTemplate(null); setPrompt(""); }} className="text-[#dc2626] text-xs">Clear</button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label className={`font-black ${textPrimary} text-xs uppercase tracking-wider mb-2 block`}>Provider</label>
                    <div className="flex flex-wrap gap-2">
                      {providers.slice(0, 6).map(p => (
                        <button key={p} onClick={() => setProvider(p)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            provider === p
                              ? "bg-[#dc2626] text-white shadow-[inset_2px_2px_4px_#b91c1c,inset_-2px_-2px_4px_#ef4444]"
                              : `${neuBtn} ${textPrimary}`}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className={`font-black ${textPrimary} text-xs uppercase tracking-wider mb-2 block`}>Model</label>
                    <div className={`${neuInset} rounded-2xl p-1`}>
                      <select value={model} onChange={e => setModel(e.target.value)}
                        className={`w-full p-3 bg-transparent font-mono text-sm ${textPrimary} border-0 outline-none`}>
                        {filtered.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className={`font-black ${textPrimary} text-xs uppercase tracking-wider mb-2 block`}>App Description</label>
                    <div className={`${neuInset} rounded-2xl p-1`}>
                      <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                        placeholder="Describe your app in detail..."
                        className={`w-full h-24 p-3 bg-transparent font-mono text-sm ${textPrimary} resize-none border-0 outline-none placeholder-[#999]`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className={`font-black ${textPrimary} text-xs uppercase tracking-wider mb-2 block`}>App Name</label>
                      <div className={`${neuInset} rounded-xl p-1`}>
                        <input value={appName} onChange={e => setAppName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                          placeholder="my-app"
                          className={`w-full p-2 bg-transparent font-mono text-sm ${textPrimary} border-0 outline-none placeholder-[#999]`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`font-black ${textPrimary} text-xs uppercase tracking-wider mb-2 block`}>Title</label>
                      <div className={`${neuInset} rounded-xl p-1`}>
                        <input value={appTitle} onChange={e => setAppTitle(e.target.value)}
                          placeholder="My App"
                          className={`w-full p-2 bg-transparent text-sm ${textPrimary} border-0 outline-none placeholder-[#999]`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags Input */}
                  <div className="mb-4">
                    <label className={`font-black ${textPrimary} text-xs uppercase tracking-wider mb-2 block`}>Tags</label>
                    <div className={`${neuInset} rounded-2xl p-1`}>
                      <div className="flex flex-wrap gap-2 p-2">
                        {tags.map((tag, index) => (
                          <div key={index} className={`flex items-center gap-2 ${neuBtn} rounded-full px-3 py-1 text-sm`}>
                            <span className={textPrimary}>{tag}</span>
                            <button onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                              className="text-[#dc2626] hover:text-[#ef4444] transition-colors">
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="flex-1 min-w-[120px]">
                          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addTag()}
                            placeholder="Add tag..."
                            className={`w-full p-2 bg-transparent text-sm ${textPrimary} border-0 outline-none placeholder-[#999]`}
                          />
                        </div>
                        <button onClick={addTag}
                          className={`${neuBtnRed} rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold`}>
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => buildAndDeploy()} disabled={generating || !prompt.trim()}
                    className={`w-full ${neuBtnRed} rounded-2xl py-4 font-black text-lg disabled:opacity-50`}>
                    {generating ? "⏳ Building..." : "🚀 Build & Deploy"}
                  </button>
                </div>
              )}

              {activeTab === "apps" && (
                <div className={`${neu} rounded-[24px] overflow-hidden`}>
                  {/* Search & Filters */}
                  <div className="p-4 space-y-3">
                    <div className={`${neuInset} rounded-xl p-1 flex items-center`}>
                      <span className="pl-3 text-[#999]">🔍</span>
                      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search apps..."
                        className={`flex-1 p-2 bg-transparent text-sm ${textPrimary} border-0 outline-none placeholder-[#999]`}
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setFilterFavorites(!filterFavorites)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold ${filterFavorites ? "bg-[#dc2626] text-white" : neuBtn + " " + textPrimary}`}>
                        ⭐ Favorites
                      </button>
                      <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className={`${neuBtn} rounded-full px-3 py-1.5 text-xs font-bold ${textPrimary} outline-none`}>
                        <option value="date">Recent</option>
                        <option value="name">Name</option>
                        <option value="views">Views</option>
                      </select>
                      <button onClick={() => setBulkMode(!bulkMode)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold ${bulkMode ? "bg-[#1a1a1a] text-white" : neuBtn + " " + textPrimary}`}>
                        ☑️ Select
                      </button>
                    </div>
                    {bulkMode && selectedApps.size > 0 && (
                      <button onClick={bulkDelete} className={`${neuBtnRed} rounded-xl w-full py-2 text-sm font-bold text-white`}>
                        🗑️ Delete {selectedApps.size} Selected
                      </button>
                    )}
                    {/* Tag Filters */}
                    {getAllTags().length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getAllTags().map(tag => (
                          <button key={tag} onClick={() => toggleTagFilter(tag)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                              selectedTags.includes(tag)
                                ? "bg-[#dc2626] text-white"
                                : neuBtn + " " + textPrimary}`}>
                            #{tag}
                          </button>
                        ))}
                        {selectedTags.length > 0 && (
                          <button onClick={() => setSelectedTags([])}
                            className={`${neuBtnRed} rounded-full px-3 py-1.5 text-xs font-bold`}>
                            Clear Filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {filteredApps.map(app => (
                      <div key={app._id} onClick={() => { if (!bulkMode) { setSelectedApp(app); setEditCode(""); setTags(app.tags || []); }}}
                        className={`p-4 border-b border-[#d0d0d0] cursor-pointer transition-all ${
                          selectedApp?._id === app._id ? neuInset : "hover:bg-[#ddd]"}`}>
                        <div className="flex items-start gap-3">
                          {bulkMode && (
                            <input type="checkbox" checked={selectedApps.has(app._id)}
                              onChange={e => {
                                const newSet = new Set(selectedApps);
                                e.target.checked ? newSet.add(app._id) : newSet.delete(app._id);
                                setSelectedApps(newSet);
                              }}
                              className="mt-1 w-5 h-5"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className={`font-black ${textPrimary} flex items-center gap-2`}>
                              <span className="text-[#dc2626]">📱</span>
                              {app.appTitle || app.appName}
                              {app.favorite && <span>⭐</span>}
                            </div>
                            <div className={`${textSecondary} text-xs flex items-center gap-2 mt-1`}>
                              <span>v{app.version || 1}</span>
                              <span>•</span>
                              <span>👁️ {app.views || 0}</span>
                            </div>
                            <div className={`${textMuted} text-xs mt-1 truncate`}>{app.prompt}</div>
                            {/* Tag Chips */}
                            {app.tags && app.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {app.tags.map((tag, tagIndex) => (
                                  <span key={tagIndex} className={`px-2 py-1 rounded-full text-xs font-bold ${neuBtn} ${textSecondary}`}>
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {!bulkMode && (
                            <div className="flex flex-col gap-1">
                              <button onClick={e => toggleFavorite(app, e)}
                                className={`${neuBtn} rounded-full w-8 h-8 flex items-center justify-center text-sm ${textPrimary}`}>
                                {app.favorite ? "⭐" : "☆"}
                              </button>
                              <button onClick={e => launchApp(app, e)}
                                className={`${neuBtnBlack} rounded-full w-8 h-8 flex items-center justify-center text-xs`}>
                                ▶
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredApps.length === 0 && (
                      <div className={`p-6 ${textMuted} text-center`}>
                        {searchQuery || filterFavorites ? "No matching apps" : "No apps yet"}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Log */}
              {log.length > 0 && (
                <div className={`${neuInset} rounded-2xl p-4`}>
                  <div className={`${textSecondary} font-mono text-xs space-y-1 max-h-32 overflow-y-auto`}>
                    {log.map((l, i) => (
                      <div key={i} className={l.includes("✅") ? "text-green-600" : l.includes("❌") ? "text-red-600" : ""}>
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className={`${neu} rounded-[24px] overflow-hidden`}>
                <div className="bg-[#1a1a1a] p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#dc2626]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#fbbf24]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
                    </div>
                    <span className="text-white font-black text-sm">
                      {selectedApp?.appTitle || selectedApp?.appName || "PREVIEW"}
                    </span>
                    {selectedApp && (
                      <span className="text-[#cccccc] text-xs">v{selectedApp.version || 1}</span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                  {selectedApp && (
                    <>
                      <button onClick={() => setShowVersions(true)}
                        className={`${neuBtn} rounded-full px-3 py-2 font-bold text-xs ${textPrimary}`}>
                        📚
                      </button>
                      <button onClick={() => generateShareLink(selectedApp)}
                        className={`${neuBtn} rounded-full px-3 py-2 font-bold text-xs ${textPrimary}`}>
                        🔗
                      </button>
                      <button onClick={() => exportSingleApp(selectedApp)}
                        className={`${neuBtn} rounded-full px-3 py-2 font-bold text-xs ${textPrimary}`}>
                        📤
                      </button>
                    </>
                  )}
                  <button onClick={() => setShowCode(!showCode)} disabled={!displayCode}
                    className={`${neuBtn} rounded-full px-4 py-2 font-bold text-xs ${textPrimary} disabled:opacity-50`}>
                    {showCode ? "Preview" : "</>"}
                  </button>
                  {selectedApp && (
                    <button onClick={e => launchApp(selectedApp, e)}
                      className={`${neuBtnBlack} rounded-full px-4 py-2 font-bold text-xs`}>
                      Launch
                    </button>
                  )}
                  {selectedApp && editCode && (
                    <button onClick={updateAndRedeploy} disabled={generating}
                      className={`${neuBtnRed} rounded-full px-4 py-2 font-bold text-xs disabled:opacity-50`}>
                      Redeploy
                    </button>
                  )}
                </div>
                </div>
                
                <div className="h-[480px] bg-white">
                  {showCode && displayCode ? (
                    <div className="relative h-full">
                      <textarea
                        value={editCode || selectedApp?.code || ""}
                        onChange={e => setEditCode(e.target.value)}
                        className="w-full h-full p-4 font-mono text-xs bg-[#1a1a1a] text-[#e8e8e8] resize-none border-0 outline-none"
                        spellCheck={false}
                      />
                      <div className="absolute bottom-2 right-2 text-[#666] text-xs">
                        {(editCode || selectedApp?.code || "").length} chars
                      </div>
                    </div>
                  ) : displayCode ? (
                    <iframe
                      srcDoc={editCode || selectedApp?.code}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-forms allow-modals allow-popups"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        {generating ? (
                          <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${neuInset} flex items-center justify-center`}>
                            <span className="text-3xl animate-spin">⚙️</span>
                          </div>
                        ) : (
                          <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${neu} flex items-center justify-center`}>
                            <span className="text-3xl">📱</span>
                          </div>
                        )}
                        <div className={`font-black ${textPrimary} text-lg`}>
                          {generating ? "BUILDING..." : "APP PREVIEW"}
                        </div>
                        {!generating && (
                          <div className={`${textMuted} text-sm mt-2`}>Build or select an app</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* App Details Card */}
              {selectedApp && (
                <div className={`${neu} rounded-[24px] p-5`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-black ${textPrimary} text-xl flex items-center gap-2`}>
                        <span className="text-[#dc2626]">📱</span>
                        {selectedApp.appTitle || selectedApp.appName}
                        {selectedApp.favorite && <span>⭐</span>}
                      </h3>
                      <div className={`${textSecondary} text-sm mt-3 space-y-1`}>
                        <div className="flex gap-4 flex-wrap">
                          <span><strong>ID:</strong> <span className="font-mono">{selectedApp.appName}</span></span>
                          <span><strong>Version:</strong> {selectedApp.version || 1}</span>
                          <span><strong>Views:</strong> {selectedApp.views || 0}</span>
                        </div>
                        <div><strong>URL:</strong> <a href={selectedApp.hostedUrl} target="_blank" className="text-[#dc2626] hover:underline">{selectedApp.hostedUrl}</a></div>
                        <div><strong>Model:</strong> {selectedApp.model}</div>
                        {/* Tags in App Details */}
                        {selectedApp.tags && selectedApp.tags.length > 0 && (
                          <div className="mt-2">
                            <strong>Tags:</strong>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {selectedApp.tags.map((tag, tagIndex) => (
                                <span key={tagIndex} className={`px-3 py-1 rounded-full text-xs font-bold ${neuBtn} ${textPrimary}`}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className={`${textMuted} text-xs mt-2`}>{selectedApp.prompt}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={e => toggleFavorite(selectedApp, e)}
                        className={`${neuBtn} rounded-full w-12 h-12 flex items-center justify-center text-xl ${textPrimary}`}>
                        {selectedApp.favorite ? "⭐" : "☆"}
                      </button>
                      <button onClick={e => launchApp(selectedApp, e)}
                        className={`${neuBtnRed} rounded-2xl px-6 py-3 font-black`}>
                        🚀 Launch
                      </button>
                      <button onClick={e => deleteApp(selectedApp, e)}
                        className={`${neuBtn} rounded-full w-12 h-12 flex items-center justify-center text-xl text-[#dc2626]`}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <div className={`inline-flex items-center gap-2 ${textMuted} text-sm`}>
            <span className="w-2 h-2 rounded-full bg-[#dc2626]"></span>
            Powered by Puter
            <span className="w-2 h-2 rounded-full bg-[#1a1a1a]"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
      // prettier-ignore-end

      const rootElement = document.getElementById("container");
      ReactDOMClient.createRoot(rootElement).render(<App />);
