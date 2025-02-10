"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTransactionId = generateTransactionId;
function generateTransactionId(tutorId, userId, courseId) {
    // Helper function to extract the middle 5 characters of an ID
    const getMiddleFiveChars = (id) => {
        const startIdx = Math.floor(id.length / 2) - 2; // 2 characters before the middle
        const endIdx = startIdx + 5; // 5 characters in total
        return id.substring(startIdx, endIdx);
    };
    // Extract middle 5 characters of each ID
    const middleTutorId = getMiddleFiveChars(tutorId);
    const middleUserId = getMiddleFiveChars(userId);
    const middleCourseId = getMiddleFiveChars(courseId);
    // Get current timestamp in milliseconds
    const timestamp = Date.now();
    // Generate a random 4-character alphanumeric string
    const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
    // Concatenate them together to form the transaction ID
    const transactionId = `${middleTutorId}${middleUserId}${middleCourseId}${timestamp}${randomString}`;
    return transactionId;
}
