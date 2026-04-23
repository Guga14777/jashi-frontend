/**
 * Address Controller - PostgreSQL Version
 */

const prisma = require('../db.cjs');

/**
 * Create address
 * POST /api/addresses
 */
exports.createAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,
      street1,
      street2,
      city,
      state,
      zip,
      phone,
      email,
      addressType,
      isDefault = false,
    } = req.body;

    if (!street1 || !city || !state || !zip) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['street1', 'city', 'state', 'zip'],
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        name: name || null,
        street1,
        street2: street2 || null,
        city,
        state,
        zip,
        phone: phone || null,
        email: email || null,
        addressType: addressType || null,
        isDefault,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      address,
    });

  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: 'Failed to create address' });
  }
};

/**
 * Get all addresses for user
 * GET /api/addresses
 */
exports.listMyAddresses = async (req, res) => {
  try {
    const userId = req.userId;
    const { addressType } = req.query;

    const where = {
      userId,
      ...(addressType && { addressType }),
    };

    const addresses = await prisma.address.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ success: true, addresses });

  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
};

/**
 * Get single address
 * GET /api/addresses/:id
 */
exports.getAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ success: true, address });

  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({ error: 'Failed to fetch address' });
  }
};

/**
 * Update address
 * PUT /api/addresses/:id
 */
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If setting as default, unset other defaults
    if (updates.isDefault === true) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: updates,
    });

    res.json({
      success: true,
      message: 'Address updated successfully',
      address: updatedAddress,
    });

  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
};

/**
 * Delete address
 * DELETE /api/addresses/:id
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await prisma.address.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Address deleted successfully' });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
};

/**
 * Set default address
 * POST /api/addresses/:id/set-default
 */
exports.setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Unset all other defaults
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    res.json({
      success: true,
      message: 'Default address set successfully',
      address: updatedAddress,
    });

  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({ error: 'Failed to set default address' });
  }
};

module.exports = exports;