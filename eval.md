
1️⃣ Global Instruction to Copilot (Very Important)
You are working on a security-focused document management system called DocGuard.
Implement evaluation logic for cryptography, access control, and anomaly detection.
Collect performance metrics, store results in MySQL, and visualize them in the admin dashboard using charts suitable for IEEE research reporting.
________________________________________
2️⃣ Database Plan (Explain First to Copilot)
Instruction
Create database tables to store experimental evaluation results instead of hard-coding values.
Tables Needed
●	crypto_evaluation
●	access_control_evaluation
●	anomaly_evaluation
Data to Store
●	File size
●	Operation type
●	Execution time
●	Success / failure
●	Timestamp
📌 Reason: IEEE papers require reproducible and stored experimental results.
________________________________________
3️⃣ Encryption & Decryption Performance Evaluation
Explain to Copilot
Measure AES encryption and decryption time for different file sizes during upload and download.
Capture start and end timestamps, compute execution time in milliseconds, and store the results.
Metrics to Capture
●	File size (MB)
●	Encryption time (ms)
●	Decryption time (ms)
Storage
●	Insert each result into crypto_evaluation
Visualization
Generate a line chart in admin dashboard where:
●	X-axis = File size
●	Y-axis = Time in milliseconds
●	Two lines = Encryption and Decryption
📌 IEEE Output: Line graph + summary table.
________________________________________
4️⃣ Digital Signature Verification Evaluation
Explain to Copilot
After signing a document, verify the digital signature during access.
Record whether verification succeeds or fails.
Metrics
●	Total verification attempts
●	Successful verifications
●	Failed verifications
Storage
●	Store counts in crypto_evaluation
Visualization
Create a bar chart showing successful vs failed verifications.
📌 IEEE Output: Table + bar chart.
________________________________________
5️⃣ Watermark Robustness Evaluation
Explain to Copilot
After watermarking a document, attempt watermark extraction after download and re-upload.
Record detection success or failure.
Metrics
●	Operation type (download, re-upload)
●	Watermark detected (yes/no)
Storage
●	Store results in crypto_evaluation
Visualization
Display a table summarizing watermark detection rate.
📌 IEEE Output: Robustness table.
________________________________________
6️⃣ Access Control Validation Evaluation
Explain to Copilot
Validate role-based, time-based, and geo-location access control rules.
Log every access request along with whether it was allowed or denied.
Metrics
●	Access type (role, time, location)
●	Expected decision
●	Actual decision
Storage
●	Insert into access_control_evaluation
Visualization
Generate a stacked bar chart showing allowed vs denied access attempts.
📌 IEEE Output: Policy enforcement accuracy table.
________________________________________
7️⃣ Anomaly Detection Evaluation
Explain to Copilot
Implement rule-based anomaly detection for failed logins, repeated downloads, and geo-violations.
Simulate attacks and log detected anomalies.
Metrics
●	Total anomaly events
●	Detected anomalies
●	Missed anomalies
●	False alarms
Storage
●	Store in anomaly_evaluation
Visualization
Create bar charts for detected vs missed anomalies and display recent anomalies in a table.
📌 IEEE Output: Detection rate and false alarm rate.
________________________________________
8️⃣ Admin Dashboard Visualization Plan
Explain to Copilot
Create an Admin Dashboard page with separate tabs for:
●	Cryptographic performance
●	Access control validation
●	Anomaly detection
Charts to Use
●	Line charts → Performance
●	Bar charts → Success vs failure
●	Tables → Raw evaluation results
📌 Use Chart.js / Recharts / ECharts.
________________________________________
