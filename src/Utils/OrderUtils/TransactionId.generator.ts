export function generateTransactionId(tutorId: string, userId: string, courseId: string): string {
    // Helper function to extract the middle 5 characters of an ID
    const getMiddleFiveChars = (id: string): string => {
        const startIdx = Math.floor(id.length / 2) - 2; // 2 characters before the middle
        const endIdx = startIdx + 5; // 5 characters in total
        return id.substring(startIdx, endIdx);
    };

    // Extract middle 5 characters of each ID
    const middleTutorId = getMiddleFiveChars(tutorId);
    const middleUserId = getMiddleFiveChars(userId);
    const middleCourseId = getMiddleFiveChars(courseId);

    // Concatenate them together to form the transaction ID
    const transactionId = `${middleTutorId}${middleUserId}${middleCourseId}`;

    return transactionId;
}
