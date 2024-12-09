const express = require("express");
const app = express();
const path = require("path");
const fetch = require("node-fetch");
const mongoose = require("mongoose");
const cheerio = require("cheerio");

const port = 8080;
const apiKey = "9d4e139b22044fddaee523c96885727b";

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/recipeApp", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));

// Define SavedRecipe schema
const savedRecipeSchema = new mongoose.Schema({
    recipeId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    image: { type: String, required: true },
});

const SavedRecipe = mongoose.model("SavedRecipe", savedRecipeSchema);

// Middleware to parse URL-encoded data (form data)
app.use(express.urlencoded({ extended: true }));

// Set EJS as the template engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Home route: Display images and titles
app.get("/recpie", async (req, res) => {
    const searchQuery = req.query.query || "";
    const number = 100; // Number of recipes to fetch
    const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&number=${number}&query=${encodeURIComponent(searchQuery)}`;

    try {
        const response = await fetch(url, { headers: { Accept: "application/json" } });

        if (!response.ok) {
            const errorDetails = await response.text();
            console.error(`Error fetching recipes: ${response.status}, Details: ${errorDetails}`);
            return res.status(500).send("An error occurred while fetching recipes.");
        }

        const data = await response.json();
        const recipes = data.results;
        res.render("home", { recipes, searchQuery });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});

// Like a recipe and add it to the database
app.post("/recpie/like", async (req, res) => {
    const { recipeId, recipeTitle, recipeImage } = req.body;

    // Check if the recipe already exists in the database
    const existingRecipe = await SavedRecipe.findOne({ recipeId });

    if (!existingRecipe) {
        // Save the new recipe to the database
        const newRecipe = new SavedRecipe({
            recipeId,
            title: recipeTitle,
            image: recipeImage,
        });
        await newRecipe.save();
    }

    res.redirect("/recpie"); // Redirect back to the home page
});

// Saved Recipes route: Display saved recipes
app.get("/saved-recipes", async (req, res) => {
    // Fetch saved recipes from the database
    const savedRecipes = await SavedRecipe.find();
    res.render("saved-recipes", { savedRecipes });
});

app.get("/recpie/saved", async (req, res) => {
    try {
        const savedRecipes = await SavedRecipe.find(); // Get all saved recipes from the database
        const message = savedRecipes.length === 0 ? "No saved recipes yet." : ""; // Set message if no recipes found

        res.render("saved", { savedRecipes, message }); // Pass message to the view
    } catch (error) {
        console.error("Error fetching saved recipes:", error);
        res.status(500).send("An error occurred while fetching saved recipes.");
    }
});

// Recipe details route: Fetch full details for a specific recipe
app.get("/recpie/:id", async (req, res) => {
    const recipeId = req.params.id;
    const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${apiKey}`;

    try {
        const response = await fetch(url, { headers: { Accept: "application/json" } });

        if (!response.ok) {
            const errorDetails = await response.text();
            console.error(`Error fetching recipe details: ${response.status}, Details: ${errorDetails}`);
            return res.status(500).send("An error occurred while fetching recipe details.");
        }

        const recipeDetails = await response.json();

        const recipe = {
            title: recipeDetails.title,
            image: recipeDetails.image,
            ingredients: recipeDetails.extendedIngredients,
            instructions: recipeDetails.instructions,
            nutrition: recipeDetails.nutrition,
            preparationTime: recipeDetails.readyInMinutes,
        };

        res.render("details", { recipe });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});
// Route to delete a saved recipe
app.post("/recpie/delete/:id", async (req, res) => {
    const recipeId = req.params.id;

    try {
        await SavedRecipe.deleteOne({ recipeId });
        res.redirect("/recpie/saved"); // Redirect to saved recipes page
    } catch (error) {
        console.error("Error deleting recipe:", error);
        res.status(500).send("An error occurred while deleting the recipe.");
    }
});


// Start the server
app.listen(port, () => {
    console.log(`App is running at http://localhost:${port}`);
});
