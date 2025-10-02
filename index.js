async function fetchData()
{
    try
    {
        const pokemonName = document.getElementById("pokemonName").value.toLowerCase();
        const respons = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`)

        if (!respons.ok)
        {
            throw new Error("could not find pokemon");
        }
        const data = await respons.json();
        const pokemonSprite = data.sprites.front_default;
        const imgElement = document.getElementById("pokemonSprite");

        imgElement.src = pokemonSprite;
        imgElement.style.display = "block";

    }
    catch (error)
    {
        console.error(error);
    }
}