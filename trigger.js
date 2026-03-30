const targetFileInput = document.getElementById('pf-results-upload');

async function triggerUpload() {
    const originalLog = console.log;
    const logBox = document.createElement("div");
    logBox.id = "my-debug-log";
    logBox.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:black; color:lime; z-index:9999; overflow:auto; padding: 20px;";
    document.body.appendChild(logBox);
    
    console.log = function(...args) {
        // originalLog.apply(console, args);
        logBox.innerHTML += args.join(" ") + "<br/>";
    };

    console.log("Fetching excel...");
    const response = await fetch('수시진학관리(2024).xlsx');
    const blob = await response.blob();
    const file = new File([blob], '수시진학관리(2024).xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    targetFileInput.files = dataTransfer.files;

    console.log("Dispatching change event...");
    const event = new Event('change', { bubbles: true });
    targetFileInput.dispatchEvent(event);
    
    setTimeout(() => {
        const selectBox = document.getElementById("pf-student-select");
        let htmlOut = "<br/><h3>pfStudents selection list:</h3>";
        for(let i=0; i<selectBox.options.length; i++) {
            const opt = selectBox.options[i];
            if (opt.textContent.includes("나현채")) {
                htmlOut += opt.textContent + "<br/>";
            }
        }
        logBox.innerHTML += htmlOut;
    }, 2000);
}

triggerUpload();
