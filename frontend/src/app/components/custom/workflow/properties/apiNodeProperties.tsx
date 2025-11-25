export default function ApiNodeProperties() {
  return (
    <div className="mt-4">

      <h2 className="text-sm font-semibold mb-2">API Node Properties</h2>
      <p className="text-xs text-gray-600">Configure your API node settings here.</p>

      <input className="bg-white border border-gray-300 rounded px-2 py-1 text-sm w-full" placeholder="Enter a number" type="number" />
      <input className="bg-white border border-gray-300 rounded px-2 py-1 text-sm w-full" placeholder="Enter another number" type="number" />

      <h2 className="mt-4 text-sm font-semibold">Result from websocket </h2>
    </div>
  );
}