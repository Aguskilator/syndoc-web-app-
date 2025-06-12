"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMedicoProfile = exports.registerUserWithRole = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
/**
 * Función callable: asigna rol "paciente" o "medico" al registrarse
 * Si es médico, se guarda la cédula y queda como "no verificado"
 */
exports.registerUserWithRole = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "El usuario no está autenticado.");
    }
    const rol = data.rol; // "paciente" o "medico"
    const cedula = data.cedula || null;
    if (!rol || (rol === "medico" && !cedula)) {
        throw new functions.https.HttpsError("invalid-argument", "Faltan datos requeridos.");
    }
    if (rol === "medico") {
        const esCedulaValida = /^\d{7,8}$/.test(cedula);
        if (!esCedulaValida) {
            throw new functions.https.HttpsError("invalid-argument", "Cédula no válida.");
        }
    }
    try {
        await admin.auth().setCustomUserClaims(uid, { rol });
        const userProfileRef = admin.firestore()
            .collection("artifacts")
            .doc("default-app-id") // Reemplaza con tu APP_ID real
            .collection("users")
            .doc(uid)
            .collection("profile")
            .doc("userProfile");
        await userProfileRef.set({
            rol,
            cedula: rol === "medico" ? cedula : null,
            verified: rol === "paciente" ? true : false,
            plan: "Gratuito",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { message: `Rol '${rol}' asignado exitosamente.` };
    }
    catch (error) {
        console.error("Error asignando rol:", error);
        throw new functions.https.HttpsError("internal", "No se pudo asignar el rol.");
    }
});
/**
 * Función callable: usada por un admin para aprobar o rechazar a un médico
 */
exports.verifyMedicoProfile = functions.https.onCall(async (data, context) => {
    var _a;
    const callerClaims = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!callerClaims || callerClaims.rol !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Solo un admin puede verificar médicos.");
    }
    const { uid, approved } = data; // uid del médico y si fue aprobado o no
    if (!uid || typeof approved !== "boolean") {
        throw new functions.https.HttpsError("invalid-argument", "Datos incorrectos.");
    }
    try {
        const userProfileRef = admin.firestore()
            .collection("artifacts")
            .doc("default-app-id")
            .collection("users")
            .doc(uid)
            .collection("profile")
            .doc("userProfile");
        await userProfileRef.set({ verified: approved }, { merge: true });
        return { message: approved ? "Médico verificado." : "Médico marcado como no verificado." };
    }
    catch (error) {
        console.error("Error verificando médico:", error);
        throw new functions.https.HttpsError("internal", "No se pudo verificar al médico.");
    }
});
//# sourceMappingURL=index.js.map