import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "./Editor";

export default function EditPost() {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [redirect, setRedirect] = useState(false);
  const [file, setFile] = useState(null);
  const [existingFile, setExistingFile] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPostInfo = async () => {
      try {
        const response = await fetch(`http://localhost:4000/post/${id}`);
        if (!response.ok) throw new Error("Failed to fetch post info");
        const postInfo = await response.json();
        setTitle(postInfo.title);
        setContent(postInfo.content);
        setSummary(postInfo.summary);
        setExistingFile(postInfo.cover);
      } catch (error) {
        setError(error.message);
      }
    };

    fetchPostInfo();
  }, []);

  async function updatePost(ev) {
    ev.preventDefault();
    const data = new FormData();
    data.set("title", title);
    data.set("summary", summary);
    data.set("content", content);
    data.set("id", id);
    if (file) {
      data.append("file", file);
    }

    try {
      const response = await fetch("http://localhost:4000/post", {
        method: "PUT",
        body: data,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update post");
      setRedirect(true);
    } catch (error) {
      setError(error.message);
    }
  }

  useEffect(() => {
    if (redirect) {
      navigate(`/post/${id}`);
    }
  }, [redirect, navigate, id]);

  return (
    <form onSubmit={updatePost}>
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
      <input type="file" onChange={(ev) => setFile(ev.target.files[0])} />
      {existingFile && !file && (
        <div>
          <p>Current file:</p>
          <img
            src={`http://localhost:4000/${existingFile}`}
            alt="Current cover"
            style={{ maxWidth: "100%" }}
          />
        </div>
      )}
      <Editor value={content} onChange={setContent} />
      <button style={{ marginTop: "5px" }}>Update Post</button>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </form>
  );
}
