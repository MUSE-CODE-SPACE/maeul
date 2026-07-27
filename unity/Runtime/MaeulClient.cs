// Maeul — Unity client. Talk to a local (free) or remote Maeul server from C#.
//
// Setup:
//   1) Run the server next to your game:  maeul serve --village examples/village
//   2) Drop this file into your Unity project (Assets/Maeul/).
//   3) See the usage example at the bottom.
//
// No paid API, no key: the server talks to your local Ollama. This client just
// POSTs JSON over HTTP, so it works in the editor, standalone, and on device.

using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace Maeul
{
    [Serializable]
    public class Reply
    {
        public string line;     // what the villager says
        public string emotion;  // neutral | happy | sad | angry | scared | surprised | tired | excited | worried
        public string action;   // optional stage direction, may be null/empty
        public string topic;    // short tag
        public string[] facts;  // lore snippets used to ground the reply (RAG)
    }

    /// <summary>Thin HTTP client for a running Maeul server.</summary>
    public class MaeulClient : MonoBehaviour
    {
        [Tooltip("Where the Maeul server runs. Local = free & offline.")]
        public string baseUrl = "http://127.0.0.1:8000";

        [Serializable] private class SayIn { public string who; public string text; public int max_tokens = 512; }
        [Serializable] private class EventIn { public string kind; public float severity = 0.7f; public string note = ""; }

        /// <summary>Ask a villager for a line. onReply gets a structured Reply.</summary>
        public void Say(string who, string text, Action<Reply> onReply, Action<string> onError = null)
        {
            var body = JsonUtility.ToJson(new SayIn { who = who, text = text });
            StartCoroutine(Post("/say", body, json =>
            {
                var reply = JsonUtility.FromJson<Reply>(json);
                onReply?.Invoke(reply);
            }, onError));
        }

        /// <summary>Trigger a world event (a disaster!) that all villagers react to.</summary>
        public void PushEvent(string kind, float severity = 0.8f, string note = "", Action onDone = null, Action<string> onError = null)
        {
            var body = JsonUtility.ToJson(new EventIn { kind = kind, severity = severity, note = note });
            StartCoroutine(Post("/event", body, _ => onDone?.Invoke(), onError));
        }

        /// <summary>Advance the in-game day (rotates dialogue, clears short-term memory).</summary>
        public void NextDay(Action onDone = null, Action<string> onError = null)
            => StartCoroutine(Post("/day", "{}", _ => onDone?.Invoke(), onError));

        private IEnumerator Post(string path, string body, Action<string> onOk, Action<string> onError)
        {
            using (var req = new UnityWebRequest(baseUrl + path, "POST"))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                yield return req.SendWebRequest();
#if UNITY_2020_1_OR_NEWER
                bool ok = req.result == UnityWebRequest.Result.Success;
#else
                bool ok = !req.isNetworkError && !req.isHttpError;
#endif
                if (ok) onOk?.Invoke(req.downloadHandler.text);
                else onError?.Invoke(req.error + " — is `maeul serve` running at " + baseUrl + "?");
            }
        }
    }
}

/*  Usage example — drop on any GameObject, wire up a MaeulClient:

    public class Villager : MonoBehaviour {
        public Maeul.MaeulClient maeul;
        public string who = "mira";

        void OnPlayerTalk(string message) {
            maeul.Say(who, message, reply => {
                dialogueUI.Show(reply.line);          // show the spoken line
                animator.SetTrigger(reply.emotion);   // drive the face/pose
                if (!string.IsNullOrEmpty(reply.action)) DoAction(reply.action);
            });
        }

        void OnEarthquake() {
            maeul.PushEvent("earthquake", 0.9f, "the ground splits near the well");
            // now every villager's next line reflects the disaster, in-character
        }
    }
*/
