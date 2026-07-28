const API_URL =
    "https://phn2pj69sd.execute-api.ap-south-1.amazonaws.com";


/* =========================================================
   UPLOAD FILE
   ========================================================= */

async function uploadFile() {

    const fileInput = document.getElementById("fileInput");
    const status = document.getElementById("status");

    const file = fileInput.files[0];

    if (!file) {
        status.textContent = "Please select a file.";
        return;
    }

    try {

        status.textContent = "Preparing upload...";

        // Ask Lambda for a temporary S3 upload URL
        const response = await fetch(
            API_URL + "/generate-upload-url",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    filename: file.name,
                    contentType:
                        file.type || "application/octet-stream"
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                "Could not generate upload URL."
            );
        }

        const data = await response.json();

        status.textContent = "Uploading...";

        // Upload directly to S3
        const uploadResponse = await fetch(
            data.uploadUrl,
            {
                method: "PUT",
                headers: {
                    "Content-Type":
                        file.type ||
                        "application/octet-stream"
                },
                body: file
            }
        );

        if (!uploadResponse.ok) {
            throw new Error("S3 upload failed.");
        }

        status.textContent =
            "Upload successful: " + file.name;

        // Clear file selector
        fileInput.value = "";

        /*
         Wait briefly for:
         S3 → ProcessUpload Lambda → DynamoDB
        */
        setTimeout(loadFiles, 1000);

    } catch (error) {

        console.error(error);

        status.textContent =
            "Upload failed: " + error.message;
    }
}


/* =========================================================
   FORMAT FILE SIZE
   ========================================================= */

function formatFileSize(bytes) {

    const size = Number(bytes);

    if (size < 1024) {
        return size + " B";
    }

    if (size < 1024 * 1024) {
        return (size / 1024).toFixed(1) + " KB";
    }

    return (
        size / (1024 * 1024)
    ).toFixed(1) + " MB";
}


/* =========================================================
   LOAD FILES FROM DYNAMODB
   ========================================================= */

async function loadFiles() {

    const fileList =
        document.getElementById("fileList");

    if (!fileList) {
        console.error(
            "Could not find #fileList element."
        );
        return;
    }

    fileList.innerHTML =
        "<p>Loading files...</p>";

    try {

        const response = await fetch(
            API_URL + "/files"
        );

        if (!response.ok) {
            throw new Error(
                "Could not load files."
            );
        }

        const files = await response.json();

        fileList.innerHTML = "";

        if (files.length === 0) {

            fileList.innerHTML =
                "<p>No files uploaded yet.</p>";

            return;
        }

        /*
         Newest uploads first.
         If uploaded_at doesn't exist,
         this simply won't affect functionality.
        */
        files.sort((a, b) => {

            return (
                new Date(b.uploaded_at || 0) -
                new Date(a.uploaded_at || 0)
            );

        });


        files.forEach(file => {

            const item =
                document.createElement("div");

            item.className = "file-item";


            /* ---------- File information ---------- */

            const info =
                document.createElement("div");

            info.className = "file-info";


            const name =
                document.createElement("span");

            name.className = "file-name";
            name.textContent = file.filename;


            const size =
                document.createElement("span");

            size.className = "file-size";
            size.textContent =
                formatFileSize(file.size);


            info.appendChild(name);
            info.appendChild(size);


            /* ---------- Buttons ---------- */

            const actions =
                document.createElement("div");

            actions.className = "file-actions";


            const downloadButton =
                document.createElement("button");

            downloadButton.textContent =
                "Download";

            downloadButton.className =
                "download-button";

            downloadButton.onclick = () => {
                downloadFile(file.file_id);
            };


            const deleteButton =
                document.createElement("button");

            deleteButton.textContent =
                "Delete";

            deleteButton.className =
                "delete-button";

            deleteButton.onclick = () => {
                deleteFile(
                    file.file_id,
                    file.filename
                );
            };


            actions.appendChild(
                downloadButton
            );

            actions.appendChild(
                deleteButton
            );


            /* ---------- Build row ---------- */

            item.appendChild(info);
            item.appendChild(actions);

            fileList.appendChild(item);
        });

    } catch (error) {

        console.error(error);

        fileList.innerHTML =
            "<p>Unable to load files.</p>";
    }
}


/* =========================================================
   DOWNLOAD FILE
   ========================================================= */

async function downloadFile(fileId) {

    try {

        const response = await fetch(
            API_URL +
            "/download/" +
            encodeURIComponent(fileId)
        );

        if (!response.ok) {
            throw new Error(
                "Could not generate download URL."
            );
        }

        const data = await response.json();

        /*
         S3 presigned download URL.
         The bucket itself remains private.
        */
        window.location.href =
            data.downloadUrl;

    } catch (error) {

        console.error(error);

        alert(
            "Download failed. Please try again."
        );
    }
}


/* =========================================================
   DELETE FILE
   ========================================================= */

async function deleteFile(
    fileId,
    filename
) {

    const confirmed = confirm(
        "Are you sure you want to delete \"" +
        filename +
        "\"?"
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            API_URL +
            "/files/" +
            encodeURIComponent(fileId),
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error(
                "Delete request failed."
            );
        }

        // Reload the list after deletion
        await loadFiles();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to delete file."
        );
    }
}


/* =========================================================
   INITIALIZE APPLICATION
   ========================================================= */

// Load existing files when CloudDrop opens
loadFiles();
