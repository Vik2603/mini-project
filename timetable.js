// Initialize Supabase client
let supabaseClient;

// Set up Supabase connection
function initSupabase() {
  try {
    const supabaseUrl = 'https://nkuankgwgjhzhmmppxsf.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdWFua2d3Z2poemhtbXBweHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNTQ1NTcsImV4cCI6MjA2MDgzMDU1N30.JPcgNBF7sA7hx9RQEpA_WpBKAL9kZCxWokRSvpWFJlA';
    
    // Check if supabase is defined
    if (typeof supabase === 'undefined') {
      console.error('Supabase is not defined. Check if the library is loaded properly.');
      return false;
    }
    
    // Using the global createClient function
    supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    
    console.log("Supabase initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Supabase:", error);
    return false;
  }
}

// Function to list all available semesters (for debugging)
async function listAllSemesters() {
  try {
    if (!supabaseClient) {
      const initialized = initSupabase();
      if (!initialized) {
        console.error("Failed to initialize Supabase");
        return [];
      }
    }
    
    // Get all distinct semester values
    const { data, error } = await supabaseClient
      .from('timetable')
      .select('semester')
      .order('semester');
      
    if (error) throw error;
    
    console.log("All available semesters:", data);
    
    // Extract unique semesters
    const semesters = [...new Set(data.map(item => item.semester))];
    console.log("Unique semesters available in database:", semesters);
    
    return semesters;
  } catch (error) {
    console.error("Error listing semesters:", error);
    return [];
  }
}

// Function to list all rows in the timetable (for debugging)
async function listAllTimetableData() {
  try {
    if (!supabaseClient) {
      const initialized = initSupabase();
      if (!initialized) {
        console.error("Failed to initialize Supabase");
        return [];
      }
    }
    
    // Get all timetable data (limited to 100 rows)
    const { data, error } = await supabaseClient
      .from('timetable')
      .select('*')
      .limit(100);
      
    if (error) throw error;
    
    console.log("First 100 rows of timetable data:", data);
    return data;
  } catch (error) {
    console.error("Error listing timetable data:", error);
    return [];
  }
}

// Function to fetch timetable data for a specific semester
async function fetchTimetable(semester) {
    console.log(`Fetching timetable for ${semester}...`);
  
    // Make sure timetable section is visible and scrolled to
    const timetableSection = document.getElementById('timetable');
    timetableSection.classList.add('active');
    timetableSection.scrollIntoView({ behavior: 'smooth' });
    
    // Update semester info
    const semesterInfo = document.getElementById('semester-info');
    semesterInfo.textContent = `Viewing timetable for ${semester}`;
  
    if (!supabaseClient) {
      console.log("Supabase not initialized yet, initializing now...");
      const success = initSupabase();
      if (!success) {
        alert("Failed to connect to the database. Please try refreshing the page.");
        return;
      }
    }

    // Get the table body and clear it
    const tbody = document.querySelector('#timetable-data tbody');
    tbody.innerHTML = '<tr><td colspan="11">Loading timetable data...</td></tr>';
  
    // Show loading indicator
    const loader = document.getElementById('loading-timetable');
    loader.style.display = 'block';
    
    // Prepare the semester string (handle case sensitivity)
    const trimmedSemester = semester.trim();
  
    try {
      console.log(`Making direct query for semester: "${trimmedSemester}"`);
      
      // Debug: List all available data to see what's in the database
      const allData = await listAllTimetableData();
      console.log("All database data:", allData);
      
      // Try direct exact match first (no case conversion)
      const { data, error } = await supabaseClient
        .from('timetable')
        .select('*')
        .eq('semester', trimmedSemester);
  
      console.log("Supabase response:", { data, error });
      
      if (!data || data.length === 0) {
        console.log("No exact match found, trying case insensitive search...");
        
        // Try case insensitive search as fallback
        const caseInsensitiveResult = await supabaseClient
          .from('timetable')
          .select('*')
          .ilike('semester', trimmedSemester);
          
        console.log("Case insensitive search result:", caseInsensitiveResult);
        
        // Use the case insensitive results if available
        if (caseInsensitiveResult.data && caseInsensitiveResult.data.length > 0) {
          displayTimetable(caseInsensitiveResult.data, semester);
        } else {
          // If still no data, display the no data message
          displayTimetable([], semester);
        }
      } else {
        // Display the exact match results
        displayTimetable(data, semester);
      }
  
      // Hide loader
      loader.style.display = 'none';
    } catch (error) {
      console.error('Error fetching timetable:', error);
      loader.style.display = 'none';
      
      // Display error in the table
      tbody.innerHTML = `
        <tr>
          <td colspan="11">
            <div style="text-align: center; padding: 20px;">
              <p>Error fetching timetable: ${error.message || 'Unknown error'}</p>
              <p>Please try again or contact support if the problem persists.</p>
            </div>
          </td>
        </tr>`;
    }
  }

// Helper function to format a cell's content
function formatCellContent(cellData) {
  if (!cellData || cellData === 'N/A') return '';
  
  console.log("Formatting cell data:", cellData, "Type:", typeof cellData);
  
  // Check if the data is in JSON format (for complex cells with subject, faculty, room)
  try {
    // If it's already an object, use it directly
    if (typeof cellData === 'object' && cellData !== null) {
      console.log("Cell data is an object:", cellData);
      return `
        <div class="subject">${cellData.subject || ''}</div>
        <div class="faculty">${cellData.faculty || ''}</div>
        <div class="room">${cellData.room || ''}</div>
      `;
    }
    
    // If it's a string that might be JSON
    if (typeof cellData === 'string' && 
        (cellData.startsWith('{') || cellData.includes('subject'))) {
      // Otherwise try to parse it as JSON
      const parsed = JSON.parse(cellData);
      console.log("Parsed JSON from string:", parsed);
      return `
        <div class="subject">${parsed.subject || ''}</div>
        <div class="faculty">${parsed.faculty || ''}</div>
        <div class="room">${parsed.room || ''}</div>
      `;
    }
    
    // Just plain text
    return cellData;
  } catch (e) {
    console.log("Not JSON, treating as plain text:", cellData);
    // If not JSON, just return the text
    return cellData;
  }
}

// Function to display timetable data
function displayTimetable(data, semester) {
  const tbody = document.querySelector('#timetable-data tbody');
  
  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11">
          <div style="text-align: center; padding: 20px;">
            <p>No timetable entries found for "${semester}".</p>
            <p>Please check that you have added this semester to your database.</p>
            <button onclick="listAllSemesters(); return false;" style="padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Debug: List Available Semesters</button>
            <button onclick="checkRLS(); return false;" style="padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; margin-left: 10px; cursor: pointer;">Check Database Access</button>
          </div>
        </td>
      </tr>`;
    return;
  }
  
  console.log(`Displaying ${data.length} rows of data for ${semester}`);
  
  // Clear tbody before adding new rows
  tbody.innerHTML = '';
  
  // Sort by day of week
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  data.sort((a, b) => {
    return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
  });
  
  // Create rows
  data.forEach(item => {
    console.log("Processing row:", item);
    
    const row = document.createElement('tr');
    
    // Day column
    const dayCell = document.createElement('td');
    dayCell.textContent = item.day;
    row.appendChild(dayCell);
    
    // Add period 1 (8:30-9:30)
    const p1Cell = document.createElement('td');
    p1Cell.innerHTML = formatCellContent(item.p1);
    row.appendChild(p1Cell);
    
    // Add period 2 (9:30-10:30)
    const p2Cell = document.createElement('td');
    p2Cell.innerHTML = formatCellContent(item.p2);
    row.appendChild(p2Cell);
    
    // Add break period (10:30-11:00)
    const breakCell = document.createElement('td');
    breakCell.className = 'break-period';
    breakCell.textContent = 'Break';
    row.appendChild(breakCell);
    
    // Add period 3 (11:00-12:00)
    const p3Cell = document.createElement('td');
    p3Cell.innerHTML = formatCellContent(item.p3);
    row.appendChild(p3Cell);
    
    // Add period 4 (12:00-1:00)
    const p4Cell = document.createElement('td');
    p4Cell.innerHTML = formatCellContent(item.p4);
    row.appendChild(p4Cell);
    
    // Add lunch period (1:00-2:00)
    const lunchCell = document.createElement('td');
    lunchCell.className = 'break-period';
    lunchCell.textContent = 'Lunch';
    row.appendChild(lunchCell);
    
    // Add period 5 (2:00-3:00)
    const p5Cell = document.createElement('td');
    p5Cell.innerHTML = formatCellContent(item.p5);
    row.appendChild(p5Cell);
    
    // Add period 6 (3:00-4:00)
    const p6Cell = document.createElement('td');
    p6Cell.innerHTML = formatCellContent(item.p6);
    row.appendChild(p6Cell);
    
    // Add period 7 (4:00-5:00)
    const p7Cell = document.createElement('td');
    p7Cell.innerHTML = formatCellContent(item.p7);
    row.appendChild(p7Cell);
    
    // Add period 8 (5:00-6:00)
    const p8Cell = document.createElement('td');
    p8Cell.innerHTML = formatCellContent(item.p8);
    row.appendChild(p8Cell);
    
    tbody.appendChild(row);
  });
}

// Check if Row Level Security might be blocking access
async function checkRLS() {
  try {
    if (!supabaseClient) {
      initSupabase();
    }
    
    console.log("Testing database access...");
    
    // Try a simple count query
    const countResult = await supabaseClient
      .from('timetable')
      .select('*', { count: 'exact', head: true });
    
    console.log("Count result:", countResult);
    
    // Test anon permissions
    const { data, error } = await supabaseClient.auth.getSession();
    
    console.log("Current session:", data, error);
    
    // Display result
    alert(`Database access check:\n- Count: ${countResult.count || 'N/A'}\n- Error: ${countResult.error ? countResult.error.message : 'None'}\n\nCheck console for details.`);
    
  } catch (error) {
    console.error("Error checking database access:", error);
    alert(`Error checking database access: ${error.message}`);
  }
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Document loaded, initializing Supabase...");
  initSupabase();
  
  // Debug: List all semesters when page loads
  setTimeout(() => {
    listAllSemesters().then(semesters => {
      console.log("Available semesters:", semesters);
    }).catch(error => {
      console.error("Failed to list semesters:", error);
    });
  }, 1000);
});

// Make debug functions available globally
window.listAllSemesters = listAllSemesters;
window.listAllTimetableData = listAllTimetableData;
window.checkRLS = checkRLS;
