import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "./Editor";

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [redirect, setRedirect] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function CreateNewPost(ev) {
    ev.preventDefault();
    const data = new FormData();
    data.set("title", title);
    data.set("summary", summary);
    data.set("content", content);
    if (file) {
      data.append("file", file);
    } else {
      setError("No file uploaded");
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/post", {
        method: "POST",
        body: data,
        credentials: "include",
      });

      if (response.ok) {
        setRedirect(true);
      } else {
        const errorText = await response.text();
        console.error("Failed to create post:", errorText);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    }
  }

  if (redirect) {
    return navigate("/");
  }
  return (
    <form onSubmit={CreateNewPost}>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(ev) => setTitle(ev.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Summary"
        value={summary}
        onChange={(ev) => setSummary(ev.target.value)}
        required
      />
      <input
        type="file"
        onChange={(ev) => setFile(ev.target.files[0])}
        required
      />
      <Editor value={content} onChange={setContent} />
      <button style={{ marginTop: "5px" }}>Create Post</button>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </form>
  );
}
