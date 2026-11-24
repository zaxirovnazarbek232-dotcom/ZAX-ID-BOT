
require("dotenv").config();

const { Bot, Keyboard } = require("grammy");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = 7783841600;

if (!TOKEN) {
    console.error("BOT_TOKEN topilmadi!");
    process.exit(1);
}

const bot = new Bot(TOKEN);
const DB_FILE = path.join(__dirname, "users.json");

let db = {
    users: {},
    admins: [OWNER_ID],
    broadcasts: 0,
    startedAt: new Date().toISOString()
};

if (fs.existsSync(DB_FILE)) {
    try {
        db = {
            ...db,
            ...JSON.parse(fs.readFileSync(DB_FILE, "utf8"))
        };
    } catch (e) {
        console.error("Database xatosi:", e.message);
    }
}

if (!db.users) db.users = {};
if (!db.admins) db.admins = [OWNER_ID];
if (!db.admins.includes(OWNER_ID)) db.admins.push(OWNER_ID);

function saveDB() {
    const temp = DB_FILE + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(db, null, 2));
    fs.renameSync(temp, DB_FILE);
}

const sessions = new Map();

function isAdmin(id) {
    return db.admins.includes(Number(id));
}

function addUser(user) {
    if (!user) return;

    const id = String(user.id);
    const old = db.users[id] || {};

    db.users[id] = {
        ...old,
        id: user.id,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        username: user.username || "",
        language_code: user.language_code || "",
        last_seen: new Date().toISOString(),
        joined: old.joined || new Date().toISOString()
    };

    saveDB();
}

function mainKeyboard() {
    return new Keyboard()
        .text("🆔 Mening ID raqamim")
        .row()
        .text("👤 Mening profilim")
        .resized();
}

function adminKeyboard() {
    return new Keyboard()
        .text("👥 Foydalanuvchilar")
        .text("📊 Statistika")
        .row()
        .text("📢 Xabar yuborish")
        .row()
        .text("🛡 Adminlar")
        .row()
        .text("🚪 Chiqish")
        .resized();
}

// START
bot.command("start", async (ctx) => {
    addUser(ctx.from);
    sessions.delete(ctx.from.id);

    await ctx.reply(
`🤖 ZAX ID BOT PRO

Assalomu alaykum, ${ctx.from.first_name}!

🆔 Telegram ID raqamingizni aniqlash botiga xush kelibsiz.

Kerakli xizmatni menyudan tanlang.`,
        { reply_markup: mainKeyboard() }
    );
});

// ADMIN PANEL
bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.reply("⛔ Sizda admin huquqi yo'q!");
    }

    sessions.delete(ctx.from.id);

    await ctx.reply(
        "💎 ZAX ID BOT PRO\n\n🛡 ADMIN PANEL\n\nBo'limni tanlang:",
        { reply_markup: adminKeyboard() }
    );
});

// PERSONAL ID
bot.hears("🆔 Mening ID raqamim", async (ctx) => {
    addUser(ctx.from);

    await ctx.reply(
        `🆔 Sizning Telegram ID:\n${ctx.from.id}`,
        {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: "📋 ID ni nusxalash",
                        copy_text: { text: String(ctx.from.id) }
                    }
                ]]
            }
        }
    );
});

// PROFILE
bot.hears("👤 Mening profilim", async (ctx) => {
    addUser(ctx.from);

    const u = ctx.from;

    await ctx.reply(
`👤 PROFIL MA'LUMOTLARI

🆔 Telegram ID: ${u.id}
👤 Ism: ${u.first_name || "Yo'q"}
👤 Familiya: ${u.last_name || "Yo'q"}
🔗 Username: ${u.username ? "@" + u.username : "Mavjud emas"}
🌐 Til: ${u.language_code || "Noma'lum"}`,
        { reply_markup: mainKeyboard() }
    );
});

// ADMIN: USERS
bot.hears("👥 Foydalanuvchilar", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;

    const users = Object.values(db.users);
    let message = `👥 FOYDALANUVCHILAR: ${users.length}\n\n`;

    users.slice(0, 30).forEach((u, i) => {
        message += `${i + 1}. ${u.first_name}\n🆔 ${u.id}\n`;
        if (u.username) message += `@${u.username}\n`;
        message += "\n";
    });

    await ctx.reply(message);
});

// ADMIN: STATS
bot.hears("📊 Statistika", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;

    await ctx.reply(
`📊 BOT STATISTIKASI

👥 Foydalanuvchilar: ${Object.keys(db.users).length}
🛡 Adminlar: ${db.admins.length}
📢 Broadcastlar: ${db.broadcasts}
📅 Ishga tushgan sana: ${new Date(db.startedAt).toLocaleDateString("uz-UZ")}`
    );
});

// ADMIN: BROADCAST
bot.hears("📢 Xabar yuborish", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;

    sessions.set(ctx.from.id, { type: "broadcast" });

    await ctx.reply(
        "📢 Barcha foydalanuvchilarga yuboriladigan xabarni yuboring.\n\nBekor qilish: /cancel"
    );
});

// ADMIN: ADMINS
bot.hears("🛡 Adminlar", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;

    await ctx.reply(
`🛡 ADMINLAR

${db.admins.map(id => "🆔 " + id).join("\n")}

Qo'shish: /addadmin ID
O'chirish: /deladmin ID`
    );
});

// ADD ADMIN
bot.command("addadmin", async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply("⛔ Faqat asosiy admin!");
    }

    const id = Number(ctx.match);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return ctx.reply("Foydalanish: /addadmin 123456789");
    }

    if (!db.admins.includes(id)) {
        db.admins.push(id);
        saveDB();
    }

    await ctx.reply(`✅ ${id} admin qilindi.`);
});

// DELETE ADMIN
bot.command("deladmin", async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply("⛔ Faqat asosiy admin!");
    }

    const id = Number(ctx.match);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return ctx.reply("Foydalanish: /deladmin 123456789");
    }

    if (id === OWNER_ID) {
        return ctx.reply("⛔ Asosiy adminni o'chirib bo'lmaydi.");
    }

    db.admins = db.admins.filter(a => a !== id);
    saveDB();

    await ctx.reply(`✅ ${id} adminlikdan olindi.`);
});

// ADMIN EXIT
bot.hears("🚪 Chiqish", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;

    sessions.delete(ctx.from.id);

    await ctx.reply(
        "✅ Admin paneldan chiqdingiz.",
        { reply_markup: mainKeyboard() }
    );
});

// CANCEL
bot.command("cancel", async (ctx) => {
    sessions.delete(ctx.from.id);

    await ctx.reply("❌ Amal bekor qilindi.", {
        reply_markup: isAdmin(ctx.from.id)
            ? adminKeyboard()
            : mainKeyboard()
    });
});

// BROADCAST SESSION
bot.on("message", async (ctx, next) => {
    const user = ctx.from;
    if (!user) return;

    addUser(user);

    const session = sessions.get(user.id);

    if (!session || !isAdmin(user.id)) return next();

    if (session.type === "broadcast") {
        if (ctx.message.text === "/cancel") return next();

        sessions.delete(user.id);

        await ctx.reply("⏳ Xabar yuborilmoqda...");

        let sent = 0;
        let failed = 0;

        for (const id of Object.keys(db.users)) {
            try {
                await bot.api.copyMessage(
                    Number(id),
                    ctx.chat.id,
                    ctx.message.message_id
                );
                sent++;
            } catch (e) {
                failed++;
            }

            await new Promise(resolve => setTimeout(resolve, 50));
        }

        db.broadcasts++;
        saveDB();

        await ctx.reply(
            `✅ YUBORISH TUGADI\n\n📨 Yetkazildi: ${sent}\n❌ Xato: ${failed}`,
            { reply_markup: adminKeyboard() }
        );

        return;
    }

    return next();
});

bot.catch((err) => {
    console.error("BOT XATOSI:", err);
});

bot.start();

console.log("🚀 ZAX ID BOT PRO ISHGA TUSHDI!");
