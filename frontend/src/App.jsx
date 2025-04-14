import { useState } from 'react';
import './index.css';
import { axiosInstance } from '../lib/axios.js';
import logo from './assets/market.png';

const userId = Date.now() + Math.floor(100 + Math.random() * 2000);

function App() {
  const [chat, setChat] = useState([]);
  const elemento = chat.map((elemento, index) => (
    <div
      key={index}
      className={`flex ${elemento.role === 'bot' ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-[70%] p-2 mb-1 mt-1 rounded-md ${
          elemento.role === 'bot'
            ? 'bg-green-900 text-green-100 ml-2'
            : 'bg-yellow-900 text-yellow-100 text-end mr-2'
        }`}
      >
        {elemento.text}
      </div>
    </div>
  ));

  const peticionBackend = async (data) => {
    try {
      const res = await axiosInstance.post('/pedir', data);
      const botrespuesta = res.data.reply;
      setChat((prev) => [...prev, { text: botrespuesta, role: 'bot' }]);
    } catch (error) {
      console.error(error);
      setChat((prev) => [...prev, { text: error.response.data.error, role: 'bot' }]);
    }
  };

  const handledSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userInput = formData.get("inputText")?.trim();
    if (!userInput) return;
    setChat(prev => [...prev, { text: userInput, role: 'user' }]);
    peticionBackend({ userId, input: userInput });
    e.currentTarget.reset();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#1a1a1a] text-white">
      {/* Header */}
      <header className="flex justify-center items-center gap-5 mt-10 mb-10">
        <img className="size-5 sm:size-10 md:size-30 lg:size-40" src={logo} alt="Logo" />
        <h1 className="sm:text-3xl md:text-5xl lg:text-6xl font-bold text-amber-500">SCORPIONTIENDA</h1>
      </header>

      {/* Sección principal */}
      <section className="flex flex-col w-11/12 sm:w-1/2 gap-y-10 p-5">
        {/* Caja de chat */}
        <div className="h-72 bg-[#2e2e2e] rounded-lg shadow-md overflow-y-auto p-2">
          {chat ? elemento : ""}
        </div>

        {/* Input y botón */}
        <form onSubmit={handledSubmit} className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <input
            type="text"
            id="inputText"
            name="inputText"
            placeholder="¿Qué vas a ordenar? 😊"
            className="p-2 w-full sm:w-2/3 rounded-md border-2 border-green-700 bg-[#1f1f1f] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <button
            type="submit"
            className="mt-4 sm:mt-0 bg-green-700 text-white py-2 px-6 rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            ¡Haz tu pedido!
          </button>
        </form>
      </section>
    </div>
  );
}

export default App;
