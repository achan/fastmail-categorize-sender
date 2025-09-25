const fetch = require('node-fetch');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

class CardDAVClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
    this.addressbookPath = `/dav/addressbooks/user/${this.username}/Default/`;
    this.auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  async makeRequest(method, path, body, headers = {}) {
    const url = this.baseUrl + path;

    const options = {
      method,
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'User-Agent': 'FastmailGroupManager/1.0',
        ...headers
      }
    };

    if (body) {
      options.body = body;
    }

    console.log(`Making ${method} request to: ${url}`);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response;
  }

  async propfind(path, depth = '1', body) {
    return this.makeRequest('PROPFIND', path, body, {
      'Content-Type': 'application/xml',
      'Depth': depth
    });
  }

  async listGroups() {
    const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
      <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
        <D:prop>
          <D:getetag/>
          <D:getcontenttype/>
          <C:address-data/>
        </D:prop>
      </D:propfind>`;

    try {
      const response = await this.propfind(this.addressbookPath, '1', propfindBody);
      const xmlText = await response.text();

      console.log('ListGroups XML response length:', xmlText.length);

      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlText);

      const groups = [];
      const responses = result['D:multistatus']['D:response'] || [];

      const responseArray = Array.isArray(responses) ? responses : [responses];
      console.log('Number of responses:', responseArray.length);

      for (const resp of responseArray) {
        // More flexible path for address data
        const propstat = Array.isArray(resp['D:propstat']) ? resp['D:propstat'] : [resp['D:propstat']];

        for (const stat of propstat) {
          if (!stat || !stat['D:prop']) continue;

          const addressData = stat['D:prop']['C:address-data'];

          if (addressData && (
            addressData.includes('X-ADDRESSBOOKSERVER-KIND:group') ||
            addressData.includes('KIND:group')
          )) {
            const vcfContent = addressData;
            const groupName = this.extractVCardProperty(vcfContent, 'FN');
            const href = resp['D:href'];

            console.log('Found group:', groupName, 'at', href);

            if (groupName) {
              groups.push({
                name: groupName,
                href,
                vcfContent
              });
            }
          }
        }
      }

      console.log('Total groups found:', groups.length);
      return groups;
    } catch (error) {
      console.error('Error listing groups:', error);
      throw new Error(`Failed to list groups: ${error.message}`);
    }
  }

  async findContactByEmail(email) {
    const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
      <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
        <D:prop>
          <D:getetag/>
          <C:address-data/>
        </D:prop>
      </D:propfind>`;

    try {
      const response = await this.propfind(this.addressbookPath, '1', propfindBody);
      const xmlText = await response.text();

      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlText);

      const responses = result['D:multistatus']['D:response'] || [];
      const responseArray = Array.isArray(responses) ? responses : [responses];

      for (const resp of responseArray) {
        const addressData = resp['D:propstat']?.[0]?.[0]?.['D:prop']?.['C:address-data'];

        if (addressData && addressData.includes(email)) {
          const uid = this.extractVCardProperty(addressData, 'UID');
          return {
            uid,
            href: resp['D:href'],
            vcfContent: addressData
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding contact:', error);
      throw new Error(`Failed to find contact: ${error.message}`);
    }
  }

  async findGroupByName(groupName) {
    // Special cases for known groups
    const knownGroups = {
      'paper trail': '6f890c23-e6ed-4825-97fb-eb0393f61b56',
      'feed': '8fcf1f9c-3524-4cb1-a6df-8d417397be19'
    };

    const lowerGroupName = groupName.toLowerCase();
    if (knownGroups[lowerGroupName]) {
      const knownUid = knownGroups[lowerGroupName];
      try {
        const contact = await this.findContactByUid(knownUid);
        if (contact && contact.isGroup) {
          return {
            name: contact.name,
            href: contact.href,
            vcfContent: contact.vcfContent,
            uid: knownUid
          };
        }
      } catch (error) {
        console.log(`Direct access to ${groupName} failed`);
      }
    }

    // Fallback to the original approach for other groups
    const groups = await this.listGroups();
    return groups.find(group => group.name.toLowerCase() === groupName.toLowerCase());
  }

  async addEmailToGroup(email, groupName) {
    try {
      // Find the contact
      const contact = await this.findContactByEmail(email);
      if (!contact) {
        throw new Error(`Contact with email ${email} not found`);
      }

      // Find the group
      const group = await this.findGroupByName(groupName);
      if (!group) {
        throw new Error(`Group ${groupName} not found`);
      }

      // Parse existing group VCF
      let vcfLines = group.vcfContent.split('\n');

      // Check if contact is already a member
      const memberLine = `X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:${contact.uid}`;
      if (vcfLines.some(line => line.trim() === memberLine)) {
        return { message: 'Contact is already a member of this group' };
      }

      // Add the member before END:VCARD
      const endIndex = vcfLines.findIndex(line => line.trim() === 'END:VCARD');
      if (endIndex === -1) {
        throw new Error('Invalid VCF format');
      }

      vcfLines.splice(endIndex, 0, memberLine);

      // Update REV timestamp
      const revIndex = vcfLines.findIndex(line => line.startsWith('REV:'));
      if (revIndex !== -1) {
        vcfLines[revIndex] = `REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
      }

      const updatedVcf = vcfLines.join('\n');

      // PUT the updated VCF
      await this.makeRequest('PUT', group.href, updatedVcf, {
        'Content-Type': 'text/vcard; charset=utf-8'
      });

      return {
        success: true,
        message: `Added ${email} to group ${groupName}`,
        contactUid: contact.uid
      };

    } catch (error) {
      console.error('Error adding email to group:', error);
      throw error;
    }
  }

  async removeEmailFromGroup(email, groupName) {
    try {
      // Find the contact
      const contact = await this.findContactByEmail(email);
      if (!contact) {
        throw new Error(`Contact with email ${email} not found`);
      }

      // Find the group
      const group = await this.findGroupByName(groupName);
      if (!group) {
        throw new Error(`Group ${groupName} not found`);
      }

      // Parse existing group VCF
      let vcfLines = group.vcfContent.split('\n');

      // Remove the member line
      const memberLine = `X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:${contact.uid}`;
      vcfLines = vcfLines.filter(line => line.trim() !== memberLine);

      // Update REV timestamp
      const revIndex = vcfLines.findIndex(line => line.startsWith('REV:'));
      if (revIndex !== -1) {
        vcfLines[revIndex] = `REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
      }

      const updatedVcf = vcfLines.join('\n');

      // PUT the updated VCF
      await this.makeRequest('PUT', group.href, updatedVcf, {
        'Content-Type': 'text/vcard; charset=utf-8'
      });

      return {
        success: true,
        message: `Removed ${email} from group ${groupName}`,
        contactUid: contact.uid
      };

    } catch (error) {
      console.error('Error removing email from group:', error);
      throw error;
    }
  }

  async createGroup(groupName) {
    const uid = uuidv4();
    const filename = `${uid}.vcf`;
    const href = this.addressbookPath + filename;

    const vcfContent = `BEGIN:VCARD
PRODID:-//FastmailGroupManager//EN
VERSION:3.0
UID:${uid}
N:${groupName}
FN:${groupName}
X-ADDRESSBOOKSERVER-KIND:group
REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VCARD`;

    try {
      await this.makeRequest('PUT', href, vcfContent, {
        'Content-Type': 'text/vcard; charset=utf-8'
      });

      return {
        success: true,
        groupName,
        uid,
        href
      };
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async getGroupMembers(groupName) {
    try {
      const group = await this.findGroupByName(groupName);
      if (!group) {
        throw new Error(`Group ${groupName} not found`);
      }

      // Extract member UIDs from VCF
      const memberLines = group.vcfContent
        .split('\n')
        .filter(line => line.startsWith('X-ADDRESSBOOKSERVER-MEMBER:'));

      const memberUids = memberLines.map(line =>
        line.replace('X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:', '').trim()
      );

      // For each member UID, try to find the contact details
      const members = [];
      for (const uid of memberUids) {
        // This is a simplified approach - in practice you might want to
        // make a more efficient query to get all contacts at once
        members.push({ uid });
      }

      return members;
    } catch (error) {
      console.error('Error getting group members:', error);
      throw error;
    }
  }

  async createContact(contactData) {
    const uid = uuidv4();
    const filename = `${uid}.vcf`;
    const href = this.addressbookPath + filename;

    // Build VCF content
    let vcfLines = [
      'BEGIN:VCARD',
      'PRODID:-//FastmailGroupManager//EN',
      'VERSION:3.0',
      `UID:${uid}`
    ];

    // Add name fields
    if (contactData.firstName || contactData.lastName) {
      const lastName = contactData.lastName || '';
      const firstName = contactData.firstName || '';
      vcfLines.push(`N:${lastName};${firstName};;;`);

      const fullName = [firstName, lastName].filter(n => n).join(' ');
      vcfLines.push(`FN:${fullName}`);
    } else if (contactData.fullName) {
      vcfLines.push(`FN:${contactData.fullName}`);
      vcfLines.push(`N:${contactData.fullName};;;;`);
    }

    // Add email
    if (contactData.email) {
      vcfLines.push(`EMAIL:${contactData.email}`);
    }

    // Add phone
    if (contactData.phone) {
      vcfLines.push(`TEL:${contactData.phone}`);
    }

    // Add organization
    if (contactData.organization) {
      vcfLines.push(`ORG:${contactData.organization}`);
    }

    // Add revision timestamp
    vcfLines.push(`REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
    vcfLines.push('END:VCARD');

    const vcfContent = vcfLines.join('\n');

    try {
      await this.makeRequest('PUT', href, vcfContent, {
        'Content-Type': 'text/vcard; charset=utf-8'
      });

      return {
        success: true,
        uid,
        href,
        vcfContent
      };
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  async addContactToGroupByUid(contactUid, groupName) {
    try {
      // Find the group
      const group = await this.findGroupByName(groupName);
      if (!group) {
        throw new Error(`Group ${groupName} not found`);
      }

      // Parse existing group VCF
      let vcfLines = group.vcfContent.split('\n');

      // Check if contact is already a member
      const memberLine = `X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:${contactUid}`;
      if (vcfLines.some(line => line.trim() === memberLine)) {
        return { message: 'Contact is already a member of this group' };
      }

      // Add the member before END:VCARD
      const endIndex = vcfLines.findIndex(line => line.trim() === 'END:VCARD');
      if (endIndex === -1) {
        throw new Error('Invalid VCF format');
      }

      vcfLines.splice(endIndex, 0, memberLine);

      // Update REV timestamp
      const revIndex = vcfLines.findIndex(line => line.startsWith('REV:'));
      if (revIndex !== -1) {
        vcfLines[revIndex] = `REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
      }

      const updatedVcf = vcfLines.join('\n');

      // PUT the updated VCF
      await this.makeRequest('PUT', group.href, updatedVcf, {
        'Content-Type': 'text/vcard; charset=utf-8'
      });

      return {
        success: true,
        message: `Added contact to group ${groupName}`,
        contactUid
      };

    } catch (error) {
      console.error('Error adding contact to group by UID:', error);
      throw error;
    }
  }

  async createContactWithGroup(contactData, groupName) {
    try {
      // First create the contact
      const contact = await this.createContact(contactData);

      // If groupName is provided, add to group using the UID directly
      if (groupName) {
        try {
          await this.addContactToGroupByUid(contact.uid, groupName);
          return {
            ...contact,
            groupAssociation: {
              success: true,
              groupName,
              message: `Contact added to group ${groupName}`
            }
          };
        } catch (groupError) {
          console.warn('Contact created but group assignment failed:', groupError);
          return {
            ...contact,
            groupAssociation: {
              success: false,
              groupName,
              error: groupError.message,
              message: 'Contact created successfully but failed to add to group'
            }
          };
        }
      }

      return contact;

    } catch (error) {
      console.error('Error creating contact with group:', error);
      throw error;
    }
  }

  async findContactByUid(uid) {
    try {
      // Try direct GET access to the VCF file
      const vcfPath = this.addressbookPath + `${uid}.vcf`;
      const response = await this.makeRequest('GET', vcfPath);

      if (!response.ok) {
        return null;
      }

      const vcfContent = await response.text();

      // Extract properties from VCF content
      const name = this.extractVCardProperty(vcfContent, 'FN');
      const email = this.extractVCardProperty(vcfContent, 'EMAIL');
      const isGroup = vcfContent.includes('X-ADDRESSBOOKSERVER-KIND:group');

      return {
        uid,
        name,
        email,
        href: vcfPath,
        vcfContent,
        isGroup,
        type: isGroup ? 'group' : 'contact'
      };

    } catch (error) {
      console.error('Error finding contact by UID:', error);
      return null;
    }
  }

  extractVCardProperty(vcfContent, property) {
    const lines = vcfContent.split('\n');
    for (const line of lines) {
      if (line.startsWith(`${property}:`)) {
        return line.substring(property.length + 1).trim();
      }
    }
    return null;
  }
}

module.exports = CardDAVClient;