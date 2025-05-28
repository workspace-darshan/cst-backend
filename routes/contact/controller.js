const { mailService } = require("../../services/email-service");
const { handleSuccess, handleError } = require("../../services/utils");
const Contact = require("./model");

const createContact = async (req, res) => {
    console.log("🚀 ~ :3 ~ createContact ~ req.body:", req.body);
    try {
        const { firstName, lastName, phone, email, organizationName, message } = req.body;
        console.log("🚀 ~ :9 ~ email:", email)
        const newContact = new Contact({
            firstName,
            lastName,
            phone,
            email,
            organizationName,
            message
        });
        const savedContact = await newContact.save();
        await mailService(
            "contact",
            { firstName, lastName, phone, email, organizationName, message }
        );

        return handleSuccess(res, savedContact, "Contact inquiry submitted successfully!", 201);
    } catch (error) {
        console.error("Error creating contact:", error);
        return handleError(res, "Something went wrong. Please try again later.", 500);
    }
};

const getContacts = async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        return handleSuccess(res, contacts, "Contacts fetched successfully.");
    } catch (error) {
        console.error("Error fetching contacts:", error);
        return handleError(res, "Error fetching contacts", 500);
    }
};

const getContactById = async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return handleError(res, "Contact not found", 404);
        }

        return handleSuccess(res, contact, "Contact fetched successfully.");
    } catch (error) {
        console.error("Error fetching contact:", error);
        return handleError(res, "Error fetching contact", 500);
    }
};

module.exports = {
    createContact,
    getContacts,
    getContactById
};