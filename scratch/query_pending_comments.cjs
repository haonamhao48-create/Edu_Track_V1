const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'edutrack-database.mysql.database.azure.com',
    user: 'edutrack_database_server7777',
    password: 'Edutrack7007@',
    port: 3306,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const teacherId = 'c50ed6b7-1e73-4bab-90df-09cc592d7199';

    // 1. Get classes taught by teacher
    await connection.query('USE edutrackacademicdb;');
    const [classes] = await connection.query(
      'SELECT Id, ClassName FROM studyclass WHERE TeacherId = ?;',
      [teacherId]
    );
    console.log('Teacher Classes:', classes);
    if (classes.length === 0) return;

    const classIds = classes.map(c => c.Id);

    // 2. Get students in these classes
    const [enrollments] = await connection.query(
      'SELECT ClassId, StudentId FROM classstudent WHERE ClassId IN (?);',
      [classIds]
    );
    console.log('Enrollments count:', enrollments.length);

    // 3. Get student names from profile db
    await connection.query('USE edutrackprofiledb;');
    const studentIds = [...new Set(enrollments.map(e => e.StudentId))];
    if (studentIds.length === 0) return;

    const [students] = await connection.query(
      'SELECT Id, FullName FROM student WHERE Id IN (?);',
      [studentIds]
    );
    const studentMap = {};
    students.forEach(s => {
      studentMap[s.Id] = s.FullName;
    });

    // 4. Get latest schedules for these classes
    await connection.query('USE edutrackacademicdb;');
    // Get the most recent schedule for each class
    const [schedules] = await connection.query(
      `SELECT Id, ClassId, Title, Date FROM schedule WHERE ClassId IN (?) AND Date <= '2026-07-05' ORDER BY Date DESC;`,
      [classIds]
    );
    console.log('Schedules:', schedules.slice(0, 5));

    // 5. Get comments from assessment db
    await connection.query('USE edutrackassessmentdb;');
    const [comments] = await connection.query(
      'SELECT ScheduleId, StudentId FROM teachercomment WHERE TeacherId = ?;',
      [teacherId]
    );
    
    // Build a set of completed comments: ScheduleId_StudentId
    const commentedSet = new Set(comments.map(c => `${c.ScheduleId}_${c.StudentId}`));

    // Find students needing feedback (enrolled in class, have a schedule, but no comment for that schedule)
    const pendingFeedback = [];
    
    // For each enrollment, find the latest schedule of that class
    enrollments.forEach(en => {
      const studentName = studentMap[en.StudentId];
      const classObj = classes.find(c => c.Id === en.ClassId);
      const className = classObj ? classObj.ClassName : 'Lớp học';

      // Find the latest schedule for this class
      const classSchedules = schedules.filter(s => s.ClassId === en.ClassId);
      if (classSchedules.length > 0) {
        const latestSchedule = classSchedules[0]; // ordered desc by date
        const key = `${latestSchedule.Id}_${en.StudentId}`;
        
        if (!commentedSet.has(key)) {
          pendingFeedback.push({
            id: en.StudentId,
            name: studentName || 'Học sinh',
            className: className,
            classId: en.ClassId,
            scheduleId: latestSchedule.Id,
            scheduleDate: latestSchedule.Date,
            scheduleTitle: latestSchedule.Title
          });
        }
      }
    });

    console.log('Suggested Students Needing Feedback:', pendingFeedback);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

main();
