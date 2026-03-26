import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  deleteDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
 
import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
 

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyAaHF-9RkjwQqaPqWfx2NTKizCeaA1R1I8",
  authDomain: "grokdb4.firebaseapp.com",
  projectId: "grokdb4",
  storageBucket: "grokdb4.firebasestorage.app",
  messagingSenderId: "725437334987",
  appId: "1:725437334987:web:dbea937bff0e8cbedb224e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

getDocs(collection(db, "notes")); // 預熱用 讓第一次連線不用等太久

// 清空輸入欄位
function clearInput(){
    document.getElementById("input_title").value = "";
    document.getElementById("input_category").value = "";
    document.getElementById("input_summary").value = "";
}

// 清空輸入按鈕
document.getElementById("clear_btn").addEventListener("click", () => {
    clearInput()
});


// 新增聊天資料
document.getElementById("add_note_btn").addEventListener("click", async () => {

    if (add_note_btn.disabled) return; // 防連點
    add_note_btn.disabled = true; // 上鎖

    const title = document.getElementById("input_title").value.trim(); // trim() 會只留內容
    const category = document.getElementById("input_category").value.trim();
    const summary = document.getElementById("input_summary").value.trim();

    if (!title || !category || !summary) {
        alert("請輸入完整資料");
        add_note_btn.disabled = false; // 解鎖
        return;
    }

    
    try {
        await addDoc(collection(db, "notes"), {
            title,
            category,
            summary,
            createdAt: serverTimestamp(), // 比較準的時間
            updatedAt: serverTimestamp()   // ⭐ 修正時間
        });

        clearInput()

    } catch (error) {
        console.error("新增失敗:", error);
        alert("新增失敗，請看 console");
    }

    add_note_btn.disabled = false; // 解鎖
});


// 詳細面板
let unsubscribeChat = null;

let currentChatRef = null;
let currentChatText = "";

function openDetailPanel(id, data) { // 提供頁面格式 載入資料進來

    document.getElementById("chat_input").value = "";

    const overlay = document.getElementById("overlay");
    overlay.classList.add("open");

    const panel = document.getElementById("detail_panel");
    panel.classList.add("open"); // 加入 open 類別 才會彈出來

    document.getElementById("detail_title").value = data.title || "";
    document.getElementById("detail_category").value = data.category || "";
    document.getElementById("detail_summary").value = data.summary || "";

    panel.dataset.id = id; // 把對應的 id 導入

    // 先取消舊監聽
    if (unsubscribeChat) unsubscribeChat();

    const chat_list = document.getElementById("chat_list");
    chat_list.innerHTML = "";

    // 照創建時間排序
    const chatQuery = query(
        collection(db, "notes", id, "chats"),
        orderBy("createdAt")
    ); 

    // 載入每條聊天訊息
    unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
        chat_list.innerHTML = "";

        /*
        snapshot.forEach(docSnap => {
            const chat = docSnap.data();

            const msg = document.createElement("div");
            msg.classList.add("chat-message"); // 加 chat-message 類別
            msg.textContent = chat.text;

            chat_list.appendChild(msg);
        });
        */
        snapshot.forEach(docSnap => {
            const chat = docSnap.data();

            const msg = document.createElement("div");
            msg.classList.add("chat-message");
            msg.textContent = chat.text;

            msg.addEventListener("click", () => {
                msg.classList.toggle("expanded");
            });

            // 右鍵事件
            msg.addEventListener("contextmenu", (e) => {
                //e.stopPropagation();
                e.preventDefault();    // ⭐ 關掉瀏覽器右鍵選單
                e.stopPropagation();   // ⭐ 防止影響外層

                const menu = document.getElementById("chat_menu");

                // 記住是哪一條
                currentChatRef = docSnap.ref;
                currentChatText = chat.text;

                // 顯示位置（滑鼠位置）
                menu.style.left = e.pageX + "px";
                menu.style.top = e.pageY + "px";

                menu.style.display = "block";
            });


            chat_list.appendChild(msg);
        });

        // 自動滾到底
        chat_list.scrollTop = chat_list.scrollHeight;
    });
}

/*
// 複製聊天
document.getElementById("copy_btn").addEventListener("click", async () => {
    if (!currentChatText) return;

    await navigator.clipboard.writeText(currentChatText);

    closeMenu();
});
*/

function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;

    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand("copy");
        alert("已複製！");
    } catch (err) {
        alert("複製失敗");
    }

    document.body.removeChild(textarea);
}

// 複製聊天 (瀏覽器版本)
document.getElementById("copy_btn").addEventListener("click", async () => {
    if (!currentChatText) return;

    try {
        await navigator.clipboard.writeText(currentChatText);
        alert("已複製！");
    } catch {
        fallbackCopy(currentChatText); // ⭐ fallback
    }

    closeMenu();
});

// 刪除聊天
document.getElementById("delete_chat_btn").addEventListener("click", async () => {
    if (!currentChatRef) return;

    const confirmDelete = confirm("確定刪除？");
    if (!confirmDelete) return;

    try {
        await deleteDoc(currentChatRef);
    } catch (error) {
        console.error("刪除失敗:", error);
    }

    closeMenu();
});

// 關閉小框
document.addEventListener("click", () => {
    closeMenu();
});

function closeMenu() {
    const menu = document.getElementById("chat_menu");
    menu.style.display = "none";
}

// 新增每條聊天
document.getElementById("send_chat_btn").addEventListener("click", async () => {

    if (send_chat_btn.disabled) return; // 防連點
    send_chat_btn.disabled = true; // 上鎖

    const panel = document.getElementById("detail_panel");
    const noteId = panel.dataset.id; // 點到的那個 note 的 id

    const input = document.getElementById("chat_input");
    const text = input.value.trim();

    if (!text) {
        send_chat_btn.disabled = false; // 解鎖
        return;
    }

    try {
        await addDoc(collection(db, "notes", noteId, "chats"), {
            text,
            createdAt: serverTimestamp()
        });

        // ⭐ 新增：更新 note 的時間（讓它排到最上面）
        await updateDoc(doc(db, "notes", noteId), {
            updatedAt: serverTimestamp()
        });

        input.value = "";
        input.style.height = "auto";   // 這樣送出訊息後高度才會調回來

    } catch (error) {
        console.error("聊天新增失敗:", error);
    }

    send_chat_btn.disabled = false; // 解鎖
});









// 關閉
document.getElementById("close_btn").addEventListener("click", () => {
    closePanel();
});

// 儲存修改
document.getElementById("save_btn").addEventListener("click", async () => {
    const panel = document.getElementById("detail_panel");
    const id = panel.dataset.id;

    const newTitle = document.getElementById("detail_title").value.trim();
    const newCategory = document.getElementById("detail_category").value.trim();
    const newSummary = document.getElementById("detail_summary").value.trim();

    if (!newTitle || !newCategory || !newSummary) {
        alert("請填完整資料");
        return;
    }

    try {
        await updateDoc(doc(db, "notes", id), {
            title: newTitle,
            category: newCategory,
            summary: newSummary,
            updatedAt: serverTimestamp()
        });

        panel.classList.remove("open"); // 收回 detail panel
        document.getElementById("overlay").classList.remove("open");

    } catch (error) {
        console.error("更新失敗:", error);
        alert("更新失敗");
    }
});


// 即時監聽資料（修正版）
const note_list = document.getElementById("note_list");

// 確保 createdAt 存在 新增的放在上面
const q = query(
    collection(db, "notes"),
    orderBy("updatedAt", "desc")
);

// 加入錯誤處理
onSnapshot(
    q,
    (snapshot) => {
        note_list.innerHTML = "";

        snapshot.forEach(docSnap => {
            const data = docSnap.data();


            const note = document.createElement("div");
            note.classList.add("note");
            note.dataset.id = docSnap.id;


            const deleteBtn = document.createElement("button"); // 刪除按鈕
            deleteBtn.classList.add("delete-btn");
            deleteBtn.textContent = "✕";


            // 防止點刪除時觸發卡片點擊
            deleteBtn.addEventListener("click", async (e) => {
                e.stopPropagation(); // 阻止當前事件繼續進行捕捉

                const confirmDelete = confirm("確定要刪除嗎？");
                if (!confirmDelete) return;

                try {
                    /*
                    const chatsRef = collection(db, "notes", docSnap.id, "chats");
                    const chatSnapshot = await getDocs(chatsRef);

                    chatSnapshot.forEach(async (chatDoc) => {
                        await deleteDoc(chatDoc.ref);
                    });
                    await deleteDoc(doc(db, "notes", docSnap.id));
                    */
                   const chatsRef = collection(db, "notes", docSnap.id, "chats"); // 先刪掉每條聊天內容
                   const chatSnapshot = await getDocs(chatsRef);

                    await Promise.all(
                        chatSnapshot.docs.map(chatDoc => deleteDoc(chatDoc.ref))
                    );

                    await deleteDoc(doc(db, "notes", docSnap.id)); // 再刪掉整個 note
                    
                } catch (error) {
                    console.error("刪除失敗:", error);
                    alert("刪除失敗");
                }
            });

            // 內容
            const content = document.createElement("div");
            content.textContent =
                "標題 : " + (data.title || "") + '\n' +
                "類別 : " + (data.category || "") + '\n' +
                "摘要 : " + (data.summary || "");


            // 點擊卡片（開編輯）
            note.addEventListener("click", () => {
                openDetailPanel(docSnap.id, docSnap.data()); // 載入點到的這張卡的資訊進 detail panel
            });

            // 組裝
            note.appendChild(deleteBtn);
            note.appendChild(content);

            note_list.appendChild(note);
        });
    },
    (error) => {
        console.error("onSnapshot 錯誤:", error);
        alert("資料讀取失敗，請查看 console");
    }
);

/*
// 關閉遮罩
document.getElementById("overlay").addEventListener("click", (e) => {
    //const panel = document.getElementById("detail_panel");

    // 如果點到的是 panel 本身就不關
    if (e.target.closest("#detail_panel")) return;

    // 點到外面才關閉
    closePanel();
});
*/

// 關閉遮罩
const overlay = document.getElementById("overlay");

let isOutsideMouseDown = false;

// 按下
overlay.addEventListener("mousedown", (e) => {
  // 如果按在 panel 外
  if (!e.target.closest("#detail_panel")) {
    isOutsideMouseDown = true;
  } else {
    isOutsideMouseDown = false;
  }
});

// 放開
overlay.addEventListener("mouseup", (e) => {
  // 必須「按下 + 放開 都在外面」
  if (isOutsideMouseDown && !e.target.closest("#detail_panel")) {
    closePanel();
  }

  isOutsideMouseDown = false; // 重置
});


function closePanel() {
    document.getElementById("overlay").classList.remove("open");
    document.getElementById("detail_panel").classList.remove("open");

    if (unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
    }
}

// 自動調整高度
const chatInput = document.getElementById("chat_input");

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";

  const maxHeight = 120; // 要跟 CSS 一致
  if (chatInput.scrollHeight > maxHeight) {
    chatInput.style.height = maxHeight + "px";
    chatInput.style.overflowY = "auto";   // 出現滾輪
  } else {
    chatInput.style.height = chatInput.scrollHeight + "px";
    chatInput.style.overflowY = "hidden"; // 不顯示滾輪
  }
});

// 再輸入時按 enter 可以送出
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // 阻止換行
    document.getElementById("send_chat_btn").click();
  }
});

